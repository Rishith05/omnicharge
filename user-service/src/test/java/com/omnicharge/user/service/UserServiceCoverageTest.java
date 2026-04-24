package com.omnicharge.user.service;

import com.omnicharge.common.exception.BadRequestException;
import com.omnicharge.common.exception.DuplicateResourceException;
import com.omnicharge.common.exception.ResourceNotFoundException;
import com.omnicharge.common.exception.UnauthorizedException;
import com.omnicharge.user.dto.ChangePasswordRequest;
import com.omnicharge.user.dto.UpdateProfileRequest;
import com.omnicharge.user.dto.UserProfileResponse;
import com.omnicharge.user.entity.AuthProvider;
import com.omnicharge.user.entity.User;
import com.omnicharge.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceCoverageTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private com.omnicharge.common.logging.LogEventPublisher logEventPublisher;

    private UserService userService;
    private User sampleUser;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        userService = new UserService(userRepository, passwordEncoder, logEventPublisher);

        sampleUser = new User();
        sampleUser.setId(1L);
        sampleUser.setEmail("test@test.com");
        sampleUser.setMobileNumber("9876543210");
        sampleUser.setFullName("Test User");
        sampleUser.setAuthProvider(AuthProvider.LOCAL);
        sampleUser.setPassword("encoded_old");
        sampleUser.setIsActive(true);
    }

    @Test
    void updateProfile_MobileAlreadyRegistered_ThrowsException() {
        UpdateProfileRequest request = new UpdateProfileRequest("New Name", "9999999999");
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(userRepository.existsByMobileNumber("9999999999")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> userService.updateProfile(1L, request));
    }

    @Test
    void updateProfile_UserNotFound_ThrowsException() {
        UpdateProfileRequest request = new UpdateProfileRequest("New Name", "9999999999");
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.updateProfile(1L, request));
    }

    @Test
    void changePassword_UserNotFound_ThrowsException() {
        ChangePasswordRequest request = new ChangePasswordRequest("old", "new");
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.changePassword(1L, request));
    }

    @Test
    void changePassword_NonLocalProvider_ThrowsException() {
        sampleUser.setAuthProvider(AuthProvider.GOOGLE);
        ChangePasswordRequest request = new ChangePasswordRequest("old", "new");
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));

        assertThrows(BadRequestException.class, () -> userService.changePassword(1L, request));
    }

    @Test
    void changePassword_IncorrectCurrentPassword_ThrowsException() {
        ChangePasswordRequest request = new ChangePasswordRequest("wrong", "new");
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("wrong", "encoded_old")).thenReturn(false);

        assertThrows(UnauthorizedException.class, () -> userService.changePassword(1L, request));
    }

    @Test
    void getAllUsers_ReturnsPage() {
        Pageable pageable = PageRequest.of(0, 10);
        when(userRepository.findAll(pageable)).thenReturn(new PageImpl<>(Collections.singletonList(sampleUser)));
        
        Page<UserProfileResponse> result = userService.getAllUsers(pageable);
        
        assertEquals(1, result.getTotalElements());
    }

    @Test
    void getUserById_NotFound_ThrowsException() {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> userService.getUserById(1L));
    }

    @Test
    void toggleUserStatus_UpdatesStatus() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        
        userService.toggleUserStatus(1L, false);
        
        assertFalse(sampleUser.getIsActive());
        verify(userRepository).save(sampleUser);
    }
}
