package com.omnicharge.user.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
public class JwtUtil {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.access-token-expiration}")
    private Long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration}")
    private Long refreshTokenExpiration;

    @jakarta.annotation.PostConstruct
    public void init() {
        log.info("JWT secret loaded in user-service, length: {}", 
                jwtSecret != null ? jwtSecret.length() : "NULL");
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(Long userId, String mobileNumber, String role, boolean isProfileComplete) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId.toString());
        claims.put("mobileNumber", mobileNumber);
        claims.put("role", role);
        claims.put("jti", UUID.randomUUID().toString());
        claims.put("isProfileComplete", isProfileComplete);
        claims.put("type", "ACCESS");

        return Jwts.builder()
                .claims(claims)
                .subject(mobileNumber)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Refresh token is now a signed JWT stored ONLY in frontend localStorage.
     * No database table or Redis storage for refresh tokens.
     */
    public String generateRefreshToken(Long userId, String mobileNumber) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId.toString());
        claims.put("mobileNumber", mobileNumber);
        claims.put("jti", UUID.randomUUID().toString());
        claims.put("type", "REFRESH");

        return Jwts.builder()
                .claims(claims)
                .subject(mobileNumber)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiration))
                .signWith(getSigningKey())
                .compact();
    }

    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Validate and extract userId from a refresh token JWT.
     * Returns userId if valid, throws exception if expired/invalid.
     */
    public Long validateRefreshToken(String refreshToken) {
        Claims claims = validateToken(refreshToken);
        
        // Ensure it's actually a refresh token
        String type = claims.get("type", String.class);
        if (!"REFRESH".equals(type)) {
            throw new io.jsonwebtoken.JwtException("Not a refresh token");
        }
        
        return Long.parseLong(claims.get("userId", String.class));
    }

    public String extractJti(String token) {
        Claims claims = validateToken(token);
        return claims.get("jti", String.class);
    }

    public Long getRemainingExpiration(String token) {
        Claims claims = validateToken(token);
        Date expiration = claims.getExpiration();
        return expiration.getTime() - System.currentTimeMillis();
    }

    public Long getAccessTokenExpiration() {
        return accessTokenExpiration;
    }

    public Long getRefreshTokenExpiration() {
        return refreshTokenExpiration;
    }
}
