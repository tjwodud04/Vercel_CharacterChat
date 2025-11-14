# Security Patches Applied

Date: 2025-11-14

## Summary
This document outlines the security vulnerabilities that were identified and patched in this project by updating dependencies in requirements.txt.

---

## Critical Severity

### 1. h11 - Malformed Chunked-Encoding Bodies (CVE-2025-43859)
**Severity:** Critical (CVSS 9.1)

**Description:**
A leniency in h11's parsing of line terminators in chunked-coding message bodies can lead to request smuggling vulnerabilities. The library did not validate that the trailing \r\n bytes were correct, potentially allowing attackers to concatenate requests and steal session credentials.

**Previous Version:** 0.14.0
**Updated Version:** >=0.16.0

**References:**
- https://github.com/advisories/GHSA-vqfr-h8mv-ghfj
- https://nvd.nist.gov/vuln/detail/CVE-2025-43859

---

## High Severity

### 2. Starlette - DoS via Range Header Merging (CVE-2025-62727)
**Severity:** High (CVSS 7.5)

**Description:**
An unauthenticated attacker can send a crafted HTTP Range header that triggers quadratic-time processing in Starlette's FileResponse Range parsing/merging logic. This enables CPU exhaustion per request, causing denial-of-service for endpoints serving files. The root cause is the use of a regular expression with catastrophic backtracking.

**Previous Version:** 0.45.3
**Updated Version:** >=0.49.1

**Impact:** Any Starlette app serving files via FileResponse or StaticFiles; frameworks built on Starlette (e.g., FastAPI) are indirectly impacted.

**Additional CVE Fixed:** CVE-2025-54121 (Multipart Form DoS) is also fixed in version 0.49.1+

**References:**
- https://github.com/advisories/GHSA-7f5h-v6xp-fcq8
- https://nvd.nist.gov/vuln/detail/CVE-2025-62727

---

## Moderate Severity

### 3. Jinja2 - Sandbox Breakout via Attr Filter (CVE-2025-27516)
**Severity:** Moderate

**Description:**
Jinja2 is vulnerable to a sandbox breakout through the attr filter that allows attackers to execute arbitrary Python code. The |attr filter could bypass the environment's attribute lookup and get a reference to a string's plain format method.

**Previous Version:** 3.1.5
**Updated Version:** >=3.1.6

**Impact:** Users of applications which execute untrusted templates are affected.

**References:**
- https://github.com/advisories/GHSA-cpwx-vrp4-4pq7
- Red Hat Bugzilla: https://bugzilla.redhat.com/show_bug.cgi?id=2350190

---

### 4. Flask-CORS - Multiple Vulnerabilities
**Severity:** Moderate

**Description:**
Flask-CORS contains multiple vulnerabilities related to improper handling of CORS requests:
- **CVE-2024-6866:** Improper Handling of Case Sensitivity - Request path matching is case-insensitive while URLs are case-sensitive, allowing unauthorized origins to access restricted paths
- **CVE-2024-6839:** Improper regex path matching vulnerability
- **CVE-2024-6844:** Inconsistent CORS matching

**Previous Version:** 5.0.0
**Updated Version:** >=6.0.1

**References:**
- https://github.com/advisories/GHSA-43qf-4rqw-9q2g
- https://advisories.gitlab.com/pkg/pypi/flask-cors/CVE-2024-6866/

---

## Low Severity

### 5. Flask - Fallback Key Misconfiguration (CVE-2025-47278)
**Severity:** Low

**Description:**
Flask 3.1.0 contains a critical issue with the handling of fallback keys in SECRET_KEY_FALLBACKS configuration. Flask was incorrectly constructing the key list in reverse, passing the signing key first. Sites using key rotation are likely to unexpectedly be signing their sessions with stale keys.

**Previous Version:** 3.1.0
**Updated Version:** >=3.1.1

**References:**
- https://nvd.nist.gov/vuln/detail/cve-2025-47278
- https://advisories.gitlab.com/pkg/pypi/flask/CVE-2025-47278/

---

## Installation Instructions

To apply these security patches, run the following command:

```bash
pip install --upgrade -r requirements.txt
```

Or install specific packages:

```bash
pip install --upgrade h11>=0.16.0 starlette>=0.49.1 Jinja2>=3.1.6 Flask-Cors>=6.0.1 Flask>=3.1.1
```

## Verification

After updating, verify the installed versions:

```bash
pip list | grep -E "h11|starlette|Jinja2|Flask-Cors|Flask"
```

Expected output should show:
- h11 >= 0.16.0
- starlette >= 0.49.1
- Jinja2 >= 3.1.6
- Flask-Cors >= 6.0.1
- Flask >= 3.1.1

## Testing Recommendations

1. Run all existing unit tests to ensure compatibility
2. Test file upload functionality (affected by Starlette patches)
3. Test CORS configurations (affected by Flask-CORS patches)
4. Verify template rendering works correctly (affected by Jinja2 patch)
5. Check session management functionality (affected by Flask patch)

## Rollback Plan

If issues arise after updating, you can rollback by restoring the original requirements.txt and running:

```bash
pip install --force-reinstall -r requirements.txt
```

However, please note that rolling back will re-expose your application to the security vulnerabilities listed above.

---

**Note:** These patches address all identified security vulnerabilities as of 2025-11-14. Regular security audits and dependency updates are recommended to maintain application security.
