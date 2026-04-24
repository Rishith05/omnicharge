package com.omnicharge.logging.service;

import com.omnicharge.common.logging.LogEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

class LogFileWriterServiceCoverageTest {

    private LogFileWriterService service;
    
    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        service = new LogFileWriterService();
        ReflectionTestUtils.setField(service, "logBaseDir", tempDir.toString());
    }

    @Test
    void writeToFile_CriticalLevels_WritesToBoth() throws IOException {
        LogEvent event = LogEvent.builder()
                .serviceName("test-service")
                .level("ERROR")
                .message("Crisis!")
                .timestamp(LocalDateTime.now())
                .build();

        service.writeToFile(event);

        assertTrue(Files.exists(tempDir.resolve("test-service/test-service.log")));
        assertTrue(Files.exists(tempDir.resolve("all-services.log")));
    }

    @Test
    void writeToFile_LifecycleEvent_WritesToBoth() throws IOException {
        LogEvent event = LogEvent.builder()
                .serviceName("test-service")
                .level("INFO")
                .eventType("LIFECYCLE")
                .message("Started")
                .build();

        service.writeToFile(event);

        assertTrue(Files.exists(tempDir.resolve("all-services.log")));
    }

    @Test
    void writeToFile_DebugEvent_WritesOnlyToServiceLog() throws IOException {
        LogEvent event = LogEvent.builder()
                .serviceName("test-service")
                .level("DEBUG")
                .message("Poking around")
                .build();

        service.writeToFile(event);

        assertTrue(Files.exists(tempDir.resolve("test-service/test-service.log")));
        assertFalse(Files.exists(tempDir.resolve("all-services.log")));
    }

    @Test
    void formatLogLine_NullFields_HandlesGracefully() {
        LogEvent event = new LogEvent();
        event.setServiceName("test");
        // All other fields null
        
        // This is a private method, but we can hit it via public writeToFile
        assertDoesNotThrow(() -> service.writeToFile(event));
    }

    @Test
    void formatLogLine_WithStackTrace_IncludesIt() throws IOException {
        LogEvent event = LogEvent.builder()
                .serviceName("test")
                .level("ERROR")
                .message("Fail")
                .stackTrace("java.lang.NullPointerException at...")
                .build();

        service.writeToFile(event);
        
        String content = Files.readString(tempDir.resolve("test/test.log"));
        assertTrue(content.contains("java.lang.NullPointerException"));
    }

    @Test
    void writeWithRolling_IOException_HandlesGracefully() {
        // We can force IOException by making the directory a file
        LogEvent event = LogEvent.builder()
                .serviceName("blocked")
                .level("INFO")
                .build();
        
        try {
            Files.writeString(tempDir.resolve("blocked"), "I am a file, not a dir");
            assertDoesNotThrow(() -> service.writeToFile(event));
        } catch (IOException e) {
            fail("Setup failed");
        }
    }
}
