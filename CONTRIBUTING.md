# Contributing to Raabta

Thank you for your interest in contributing to **Raabta**! We welcome bug reports, feature requests, pull requests, and documentation improvements.

---

## Code of Conduct

Please help us keep this project open, inclusive, and welcoming to everyone. Be respectful, constructve, and polite in all issues and pull request discussions.

---

## How Can I Contribute?

### 1. Reporting Bugs
Before opening a new issue, please search existing issues to see if it has already been reported.

When submitting a bug report, include:
- A clear, descriptive title.
- Steps to reproduce the problem.
- Expected behavior vs actual behavior.
- Environment details (Node version, browser, OS).

### 2. Suggesting Enhancements
Feature requests are appreciated! Please explain:
- Why the feature would be useful.
- How you envision the user experience or architecture.

### 3. Submitting Pull Requests

1. **Fork the repository** and create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Follow coding standards**:
   - Write clean, self-documenting JavaScript / React code.
   - Maintain modern styling rules (Vanilla CSS variables, responsive design).
   - Ensure backend endpoints handle errors gracefully and pass middleware validations.
3. **Test your changes**:
   - Run `npm run build` in `frontend` to verify no Vite bundling errors occur.
   - Run Node syntax/runtime checks on `backend`.
4. **Commit your changes**:
   ```bash
   git commit -m "feat: add your feature summary"
   ```
5. **Push to your fork** and submit a Pull Request targeting `main`.

---

## Development Guidelines

- **Do NOT commit secrets**: Never check in real `.env` keys, API credentials, or MongoDB connection strings.
- **Maintain backwards compatibility**: Ensure existing Socket.IO events and REST API contracts remain operational.
- **Formatting**: Use consistent indentation (2 spaces) and standard JavaScript conventions.

Thank you for contributing!
