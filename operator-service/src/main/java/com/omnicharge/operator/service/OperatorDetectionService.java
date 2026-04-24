package com.omnicharge.operator.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.omnicharge.common.logging.LogEvent;
import com.omnicharge.common.logging.LogEventPublisher;
import com.omnicharge.operator.client.NumverifyClient;
import com.omnicharge.operator.dto.NumverifyResponse;
import com.omnicharge.operator.dto.OperatorDetectionResponse;
import com.omnicharge.operator.dto.PlanResponse;
import com.omnicharge.operator.entity.Operator;
import com.omnicharge.operator.repository.OperatorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class OperatorDetectionService implements IOperatorDetectionService {

    private final NumverifyClient numverifyClient;
    private final OperatorRepository operatorRepository;
    private final IPlanService planService;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    private final LogEventPublisher logEventPublisher;

    private static final long CACHE_TTL_HOURS = 24;

    @Override
    public OperatorDetectionResponse detectOperator(String mobileNumber) {
        // Check Redis cache first
        String cacheKey = "operator:detect:" + mobileNumber;
        String cachedResponse = null;
        try {
            cachedResponse = redisTemplate.opsForValue().get(cacheKey);
        } catch (Exception e) {
            log.warn("Redis is down, skipping cache for mobile: {}", mobileNumber);
        }
        
        if (cachedResponse != null) {
            try {
                log.info("Cache hit for mobile: {}", mobileNumber);
                return objectMapper.readValue(cachedResponse, OperatorDetectionResponse.class);
            } catch (JsonProcessingException e) {
                log.error("Failed to deserialize cached response", e);
            }
        }

        // Call Numverify API
        NumverifyResponse numverifyResponse = numverifyClient.detectOperator(mobileNumber);
        
        Operator operator = null;
        if (numverifyResponse != null && Boolean.TRUE.equals(numverifyResponse.getValid()) && numverifyResponse.getCarrier() != null) {
            // Try to match carrier name to operator
            operator = matchCarrierToOperator(numverifyResponse.getCarrier());
        }
        
        // Fallback to prefix-based detection if Numverify fails
        if (operator == null) {
            log.info("Numverify failed or no match, using prefix-based detection");
            operator = detectByPrefix(mobileNumber);
        }

        if (operator == null) {
            log.warn("Could not detect operator for mobile: {}", mobileNumber);
            
            // Log failed detection
            Map<String, Object> context = new HashMap<>();
            context.put("mobileNumber", mobileNumber);
            context.put("detectionResult", "FAILED");
            context.put("reason", "No operator match found");
            publishBusinessLog("OPERATOR_DETECTION",
                "Operator detection failed: mobile=" + mobileNumber,
                context);
            
            return null;
        }

        // Get active plans for the operator
        List<PlanResponse> plans = planService.getPlansByOperator(operator.getId());

        // Build response
        OperatorDetectionResponse response = OperatorDetectionResponse.builder()
                .operatorId(operator.getId())
                .operatorName(operator.getName())
                .operatorCode(operator.getCode())
                .logoUrl(operator.getLogoUrl())
                .plans(plans)
                .build();

        // Log successful detection
        Map<String, Object> context = new HashMap<>();
        context.put("mobileNumber", mobileNumber);
        context.put("detectionResult", "SUCCESS");
        context.put("operatorId", operator.getId());
        context.put("operatorName", operator.getName());
        context.put("operatorCode", operator.getCode());
        context.put("plansCount", plans.size());
        publishBusinessLog("OPERATOR_DETECTION",
            "Operator detected: mobile=" + mobileNumber + ", operator=" + operator.getName(),
            context);

        // Cache the response
        try {
            String jsonResponse = objectMapper.writeValueAsString(response);
            try {
                redisTemplate.opsForValue().set(cacheKey, jsonResponse, CACHE_TTL_HOURS, TimeUnit.HOURS);
                log.info("Cached operator detection for mobile: {}", mobileNumber);
            } catch (Exception e) {
                log.warn("Redis is down, unable to cache data for mobile: {}", mobileNumber);
            }
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize response for caching", e);
        }

        return response;
    }

    private Operator matchCarrierToOperator(String carrier) {
        // Fuzzy matching logic
        String carrierLower = carrier.toLowerCase();
        
        List<Operator> allOperators = operatorRepository.findByIsActive(true);
        
        for (Operator operator : allOperators) {
            String operatorNameLower = operator.getName().toLowerCase();
            String operatorCodeLower = operator.getCode().toLowerCase();
            
            // Check if carrier contains operator name or code
            if (carrierLower.contains(operatorNameLower) || 
                carrierLower.contains(operatorCodeLower) ||
                operatorNameLower.contains(carrierLower)) {
                log.info("Matched carrier '{}' to operator '{}'", carrier, operator.getName());
                return operator;
            }
        }
        
        // Specific mappings for common variations
        if (carrierLower.contains("bharti") || carrierLower.contains("airtel")) {
            return operatorRepository.findByCode("AIRTEL").orElse(null);
        } else if (carrierLower.contains("jio") || carrierLower.contains("reliance")) {
            return operatorRepository.findByCode("JIO").orElse(null);
        } else if (carrierLower.contains("vodafone") || carrierLower.contains("idea") || carrierLower.contains("vi")) {
            return operatorRepository.findByCode("VI").orElse(null);
        } else if (carrierLower.contains("bsnl")) {
            return operatorRepository.findByCode("BSNL").orElse(null);
        }
        
        return null;
    }

    private Operator detectByPrefix(String mobileNumber) {
        if (mobileNumber == null || mobileNumber.length() < 4) {
            return null;
        }
        
        // Clean number — keep last 10 digits
        String cleaned = mobileNumber.replaceAll("\\D", "");
        if (cleaned.length() > 10) {
            cleaned = cleaned.substring(cleaned.length() - 10);
        }
        
        String p4 = cleaned.substring(0, 4); // first 4 digits
        String p3 = cleaned.substring(0, 3); // first 3 digits
        
        // ── JIO prefixes (6xxx, 7xxx, 8xxx series allocated to Reliance Jio) ──
        // Includes: 62xx, 63xx, 70xx-79xx, 80xx-89xx (many 8xx series are Jio)
        if (p3.matches("(620|621|622|623|630|631|632|633|700|701|702|703|704|705|706|707|708|709)") ||
            p3.matches("(710|711|712|713|714|715|716|717|718|719)") ||
            p3.matches("(720|721|722|723|724|725|726|727|728|729)") ||
            p3.matches("(730|731|732|733|734|735|736|737|738|739)") ||
            p3.matches("(740|741|742|743|744|745|746|747|748|749)") ||
            p3.matches("(750|751|752|753|754|755|756|757|758|759)") ||
            p3.matches("(760|761|762|763|764|765|766|767|768|769)") ||
            p3.matches("(770|771|772|773|774|775|776|777|778|779)") ||
            p3.matches("(780|781|782|783|784|785|786|787|788|789)") ||
            p3.matches("(790|791|792|793|794|795|796|797|798|799)") ||
            p3.matches("(800|801|802|803|804|805|806|807|808|809)") ||
            p3.matches("(810|811|812|813|814|815|816|817|818|819)") ||
            p3.matches("(820|821|822|823|824|825|826|827|828|829)") ||
            p3.matches("(830|831|832|833|834|835|836|837|838|839)") ||
            p3.matches("(840|841|842|843|844|845|846|847|848|849)") ||
            p3.matches("(850|851|852|853|854|855|856|857|858|859)") ||
            p3.matches("(860|861|862|863|864|865|866|867|868|869)") ||
            p3.matches("(870|871|872|873|874|875|876|877|878|879)") ||
            p3.matches("(880|881|882|883|884|885|886|887|888|889)") ||
            p3.matches("(890|891|892|893|894|895|896|897|898|899)") ||
            p4.matches("(9999|6200|6300)")) {
            log.info("Prefix {} matched to JIO", p3);
            return operatorRepository.findByCode("JIO").orElse(null);
        }
        
        // ── AIRTEL prefixes (classic 9xxx series) ──
        if (p4.matches("(9876|9988|9910|9811|9891|9818|9871|9873|9650|9560)") ||
            p3.matches("(960|961|962|963|964|965|966|967|968|969)") ||
            p3.matches("(970|971|972|973|974|975|976|977|978|979)") ||
            p3.matches("(980|981|982|983|984|985|986|987|988|989)") ||
            p3.matches("(990|991|992|993|994|995|996|997|998|999)")) {
            log.info("Prefix {} matched to AIRTEL", p3);
            return operatorRepository.findByCode("AIRTEL").orElse(null);
        }
        
        // ── VI (Vodafone-Idea) prefixes ──
        if (p4.matches("(9898|9090|8080|9825|9925|9824|9374|7600|7201)") ||
            p3.matches("(900|901|902|903|904|905|906|907|908|909)")) {
            log.info("Prefix {} matched to VI", p3);
            return operatorRepository.findByCode("VI").orElse(null);
        }
        
        // ── BSNL prefixes ──
        if (p4.matches("(9449|9448|9446|9447|9400|9496|9495|9447)") ||
            p3.matches("(944|945|946|947|948|949)")) {
            log.info("Prefix {} matched to BSNL", p3);
            return operatorRepository.findByCode("BSNL").orElse(null);
        }
        
        // Fallback: distribute deterministically
        List<Operator> activeOperators = operatorRepository.findByIsActive(true);
        if (activeOperators.isEmpty()) return null;
        
        int hash = Math.abs(mobileNumber.hashCode());
        Operator fallback = activeOperators.get(hash % activeOperators.size());
        log.info("No prefix match for {}, falling back to {}", p3, fallback.getName());
        return fallback;
    }
    
    // Helper method for business operation logging
    private void publishBusinessLog(String eventType, String message, Map<String, Object> context) {
        LogEvent logEvent = LogEvent.builder()
                .serviceName("operator-service")
                .level("INFO")
                .logger(this.getClass().getName())
                .message(message)
                .eventType(eventType)
                .context(context)
                .timestamp(LocalDateTime.now())
                .build();
        logEventPublisher.publish(logEvent);
    }
}
