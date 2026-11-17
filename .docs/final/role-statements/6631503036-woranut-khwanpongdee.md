# Role Statement — Woranut Khwanpongdee

**Student ID:** 6631503036  
**Role:** AI Lead

As AI Lead for AdvisingLog, I managed how our team used AI during development and checked where AI fits into our system safely. I set up the rules in [`CLAUDE.md`](../../../CLAUDE.md) and [`AGENTS.md`](../../../AGENTS.md) to make sure our team followed Thai laws, especially PDPA Section 26 for sensitive student data and Computer Crime Act Section 26 for logging. This prevented any student records from leaking into public AI models.

On the technical side, I tested our in-product AI prototype by writing automated tests in [`frontend/src/aiService.test.ts`](../../../frontend/src/aiService.test.ts) to see how well it summarizes advising sessions. Because student advising involves sensitive topics like health and family issues, I decided to keep the AI summarizer turned off in production to protect student privacy. I also organized our UAT testing numbers in [`ai-logic.md`](../ai-logic.md) and [`comparison-table.md`](../comparison-table.md), making sure all metrics came from real users, not made-up data.

We used AI tools (Claude 3.5 Sonnet and GPT-4o) to help write repetitive code and unit tests. Our team checked and verified every suggestion before using it.

## Reflection

### 1. Lessons Learned
Building an app with AI changed how we work:
- **Better:** We built and tested features much faster. Writing test cases with Vitest took hours instead of days.
- **Worse:** Code review became harder. AI often writes code that looks correct but secretly breaks privacy rules. We had to double-check everything manually to keep student data safe.

### 2. My Position in the Industry
In the AI era, software engineering is **more than just writing code**. AI can write code, but human engineers must decide what to build, design the system, check security, and make sure the software follows the law. I see myself as an engineer who guides and reviews AI work.

### 3. Career Roadmap
- **1-Year Plan:** Learn more about cloud and serverless backends like Cloudflare Workers, and build reliable testing tools for AI applications.
- **5-Year Plan:** Become a Senior Software Engineer or AI Solutions Architect who helps companies adopt AI safely while protecting user privacy.
