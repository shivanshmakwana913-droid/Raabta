# Security Policy

## Supported Versions

We actively issue security updates for the latest codebase on the `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

---

## Reporting a Vulnerability

If you discover a security vulnerability within this repository, please **do NOT report it via public GitHub issues**.

Instead, follow these guidelines to disclose it responsibly:

1. **Email Disclosure**: Send a detailed report to the repository maintainer (or open a private security advisory on GitHub).
2. **Include Details**:
   - Type of issue (e.g., NoSQL injection, authentication bypass, XSS, token leakage).
   - Location of vulnerable code or endpoint.
   - Proof of concept or steps to reproduce.
3. **Response Time**: We aim to acknowledge receipt of vulnerability reports within 48 hours and provide a timeline for remediation.

---

## Security Best Practices Enforced

- **Password Storage**: Passwords are hashed using `bcryptjs` with salt factor 10.
- **Data Protection**: Sensitive authentication data (`password`, `passwordResetToken`) are excluded from query results by default (`select: false`).
- **Database Level Uniqueness**: Case-insensitive usernames are enforced using normalized unique B-tree indexes in MongoDB.
- **CORS Isolation**: Cross-Origin Resource Sharing is strictly constrained to authorized client origins via environment variables.
- **Rate Limiting**: Authentication endpoints are shielded against brute-force attacks via `express-rate-limit`.
