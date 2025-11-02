# Future Features

This document tracks feature requests that have been deferred for future implementation.

## Manual Filter Parameter Suggestions

**Status:** Deferred (User requested not to implement now)

**Description:**
Allow users to suggest custom normalization rules that the system can learn from and apply to future data processing.

**Use Case:**
When users notice patterns in their data that aren't being normalized correctly, they could suggest custom rules like:
- "Always convert 'St.' to 'Street' in addresses"
- "Treat 'VP' as a job title credential to strip"
- "Normalize 'Ph.D.' to 'PhD'"

**Implementation Ideas:**
1. **UI Component:** Add a "Suggest Normalization Rule" button in the results section
2. **Rule Submission Form:**
   - Input pattern (what to match)
   - Output pattern (what to replace with)
   - Data type (name, address, phone, email)
   - Example input/output
   - Optional: Confidence level or frequency threshold

3. **Backend Storage:**
   - Store user suggestions in database
   - Track suggestion frequency across users
   - Admin review queue for approving suggestions

4. **Learning System:**
   - Aggregate suggestions from multiple users
   - Automatically apply high-confidence rules (e.g., 5+ users suggest same rule)
   - Allow users to opt-in to community-suggested rules
   - Provide rule library/marketplace

5. **Rule Management:**
   - User dashboard to view their suggested rules
   - Enable/disable specific rules
   - See which rules are active in their processing
   - Export/import rule sets

**Technical Considerations:**
- Rule validation to prevent breaking existing normalizations
- Performance impact of custom rules on batch processing
- Security: Prevent malicious regex patterns
- Versioning: Track which rules were applied to which datasets
- Testing: Automated testing of user-suggested rules

**Benefits:**
- Crowdsourced improvement of normalization accuracy
- Industry-specific customization (healthcare, finance, etc.)
- Faster adaptation to new credential types or naming conventions
- User empowerment and engagement

**Challenges:**
- Rule conflicts (multiple users suggest different rules for same pattern)
- Quality control (preventing bad suggestions from degrading quality)
- Complexity: UI/UX for non-technical users to define rules
- Maintenance: Reviewing and curating community suggestions

**Priority:** Medium (valuable for power users, but core normalization works well)

**Estimated Effort:** 2-3 weeks
- Week 1: UI for rule submission + database schema
- Week 2: Rule application engine + testing framework
- Week 3: Admin review dashboard + community features

**Related Issues:**
- None yet (feature not requested by other users)

**Notes:**
- User mentioned this idea during v3.6.1 development
- User decided to defer implementation to focus on core bug fixes first
- Consider implementing after v4.0.0 when core features are stable
