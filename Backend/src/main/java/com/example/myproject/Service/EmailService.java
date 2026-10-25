
package com.example.myproject.Service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendPasswordResetEmail(String to, String resetLink) {
        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(to);
        message.setSubject("Reset your Workflow Orchestrator password");
        message.setText(
                "We received a request to reset your password.\n\n" +
                        "Use this link to choose a new password:\n" +
                        resetLink + "\n\n" +
                        "If you did not request this, you can ignore this email."
        );

        mailSender.send(message);
    }
}
