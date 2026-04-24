package com.omnicharge.user.entity;

import com.omnicharge.common.audit.Auditable;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Email
    @Column(unique = true, nullable = true)  // Email is now OPTIONAL
    private String email;

    @Column(nullable = true)
    private String fullName;

    @NotBlank
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid mobile number")
    @Column(unique = true, nullable = false)  // Mobile is now PRIMARY identifier
    private String mobileNumber;

    @Column(nullable = true)
    private String password; // BCrypt hash for LOCAL users, NULL for Google/Phone users

    @Column(unique = true, nullable = true)
    private String googleId; // Set only for Google users

    @Column(nullable = true)
    private Boolean emailVerified = false; // Email verification status

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuthProvider authProvider;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.ROLE_USER;

    @Column(nullable = false)
    private Boolean isActive = true;
}
