# Updated Proposal: AdvisingLog (Software Engineering Advising Record System)

## 1. Problem Statement
Based on interviews with our target users, we identified the following core pain points in the current advising process:
* **Data Fragmentation:** Advising sessions currently happen across multiple scattered channels, such as emails, personal chats, or face-to-face conversations. There is no centralized system to formally aggregate and record these advising histories.
* **Privacy & Data Sharing Concerns:** Students are reluctant to disclose highly sensitive issues (e.g., mental health, family problems) due to fear of data leaks. Meanwhile, advisors often discuss student cases among themselves to find solutions but lack a recording tool with categorization tags to help filter or de-identify personal information for safety.
* **No Auto Follow-up:** After providing advice or referring a student to another department, there is rarely a follow-up mechanism to track if the issue was resolved, resulting in abandoned cases.
* **Lack of Evidence for AUN-QA:** Data scattered across personal chats or emails cannot be easily extracted into quantitative statistics (e.g., advisor workload, C5) or qualitative data (e.g., Reason Code/Root Cause for dropout cases, C8) to generate rapid Quality Reports for the QA Coordinator.

## 2. Target Users
* **Student:** Submits meeting requests to advisors to discuss academics, activities, personal limitations, or private matters.
* **Advisor:** Receives requests, manages appointments, writes brief interaction notes, applies category tags to maintain privacy, and handles case referrals.
* **QA:** Accesses the system dashboard for an overall statistical summary to generate Quality Reports for AUN-QA (views only aggregate statistics, with scoped case-level access restricted strictly to dropout cases).
* **Admin:** The core system administrator (e.g., Ajarn Oil) who imports and manages the student-advisor roster and oversees system access permissions.

## 3. Proposed Solution & Core Value
We propose **AdvisingLog**, a web application with a clean and minimal UI to reduce cognitive load, featuring:
* **SSO Login:** Secure authentication strictly via MFU Mail to verify identity.
* **Smart Form & Tagging:** A concise advising record form designed to capture only brief topics and advice. It includes a category tagging system and Cloudinary integration for secure file attachments (authenticated/private URLs) to minimize server load.
* **Auto Follow-up & Smart Routing:** Automated date reminders for case outcome updates, alongside auto-suggested "Additional Support" contact points (e.g., Student Affairs, Counselling) based on the specific problem tags selected.
* **AUN-QA Ready Dashboard:** Automatically transforms consultation logs into statistical reports, featuring strict role-based access control (RBAC) that protects sensitive case details based on the user's role.