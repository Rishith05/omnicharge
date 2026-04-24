package com.omnicharge.user.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.mail.javamail.JavaMailSender;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class EmailServiceTest {

    private EmailService emailService;

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private MimeMessage mimeMessage;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        emailService = new EmailService(mailSender);
    }

    @Test
    void sendOtpEmail_Success() {
        String email = "test@example.com";
        String otp = "123456";

        emailService.sendOtpEmail(email, otp);

        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void sendOtpEmail_Failure() {
        String email = "test@example.com";
        String otp = "123456";
        
        // Mock MessagingException or use a Spy if needed, but here JavaMailSender.send throwing is easier
        doThrow(new RuntimeException("Mail server down")).when(mailSender).send(any(MimeMessage.class));

        assertThrows(RuntimeException.class, () -> emailService.sendOtpEmail(email, otp));
    }
}
