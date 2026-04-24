package com.omnicharge.user.config;

import com.omnicharge.user.entity.AuthProvider;
import com.omnicharge.user.entity.Role;
import com.omnicharge.user.entity.User;
import com.omnicharge.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedAdminUser();
        seedDemoUser();
    }

    private void seedAdminUser() {
        String adminMobile = "8688179553";
        
        if (userRepository.existsByMobileNumber(adminMobile)) {
            log.info("Admin user already exists");
            return;
        }

        User admin = new User();
        admin.setEmail("admin@omnicharge.com");
        admin.setFullName("Admin User");
        admin.setPassword(passwordEncoder.encode("Admin@123"));
        admin.setMobileNumber(adminMobile);
        admin.setAuthProvider(AuthProvider.PHONE);
        admin.setRole(Role.ROLE_ADMIN);
        admin.setIsActive(true);

        userRepository.save(admin);
        log.info("Admin user created with mobile: {}", adminMobile);
    }

    private void seedDemoUser() {
        String demoMobile = "9876543210";
        
        if (userRepository.existsByMobileNumber(demoMobile)) {
            log.info("Demo user already exists");
            return;
        }

        User demoUser = new User();
        demoUser.setEmail("user1@omnicharge.com");
        demoUser.setFullName("Demo User");
        demoUser.setPassword(passwordEncoder.encode("User@123"));
        demoUser.setMobileNumber(demoMobile);
        demoUser.setAuthProvider(AuthProvider.PHONE);
        demoUser.setRole(Role.ROLE_USER);
        demoUser.setIsActive(true);

        userRepository.save(demoUser);
        log.info("Demo user created with mobile: {}", demoMobile);
    }
}
