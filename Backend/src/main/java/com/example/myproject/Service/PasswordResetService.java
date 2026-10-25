
package com.example.myproject.Service;

import com.example.myproject.Model.PasswordResetToken;
import com.example.myproject.Model.User;
import com.example.myproject.Repostiory.PasswordResetTokenRepository;
import com.example.myproject.Repostiory.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.myproject.dto.ResetPasswordRequestDTO;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final PasswordEncoder passwordEncoder;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            EmailService emailService,PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void requestPasswordReset(String email) {
        userRepository.findByEmail(email.trim().toLowerCase())
                .ifPresent(user -> {
                    byte[] randomBytes = new byte[32];
                    secureRandom.nextBytes(randomBytes);

                    String rawToken = Base64.getUrlEncoder()
                            .withoutPadding()
                            .encodeToString(randomBytes);

                    String tokenHash = hashToken(rawToken);

                    PasswordResetToken resetToken = new PasswordResetToken();
                    resetToken.setTokenHash(tokenHash);
                    resetToken.setUser(user);
                    resetToken.setExpiresAt(Instant.now().plusSeconds(900));
                    resetToken.setUsed(false);

                    tokenRepository.save(resetToken);

                    String resetLink = frontendUrl
                            + "/reset-password?token=" + rawToken;

                    emailService.sendPasswordResetEmail(
                            user.getEmail(), resetLink);
                });
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {

        if (rawToken == null || rawToken.isBlank()
                || newPassword == null || newPassword.length() < 12) {
            throw new IllegalArgumentException(
                    "A valid token and a password of at least 12 characters are required");
        }

        String tokenHash = hashToken(rawToken);

        PasswordResetToken resetToken = tokenRepository
                .findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid or expired reset link"));

        if (resetToken.isUsed()
                || !resetToken.getExpiresAt().isAfter(Instant.now())) {
            throw new IllegalArgumentException(
                    "Invalid or expired reset link");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsed(true);
        tokenRepository.save(resetToken);
    }


    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(
                    token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to hash reset token", e);
        }
    }

}
