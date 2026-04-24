package com.omnicharge.user.config;

import com.omnicharge.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class DataSeederTest {

    @Mock
    private UserRepository userRepository;
    
    @Mock
    private PasswordEncoder passwordEncoder;

    @Test
    void run_ShouldSeedUsersIfTheyDoNotExist() {
        MockitoAnnotations.openMocks(this);
        DataSeeder seeder = new DataSeeder(userRepository, passwordEncoder);
        
        when(userRepository.existsByMobileNumber(anyString())).thenReturn(false);
        
        seeder.run();
        
        verify(userRepository, times(2)).save(any());
    }

    @Test
    void run_ShouldNotSeedUsersIfTheyExist() {
        MockitoAnnotations.openMocks(this);
        DataSeeder seeder = new DataSeeder(userRepository, passwordEncoder);
        
        when(userRepository.existsByMobileNumber(anyString())).thenReturn(true);
        
        seeder.run();
        
        verify(userRepository, never()).save(any());
    }
}
