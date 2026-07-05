### IMPORTANT: Follow all of the following unordered instructions exactly!
- Ignore the SKILL.md. That's misleading and there is no valuable information for what I am asking you to do. Please do not use python for this project. Use javascript or typescript.
- Follow the plan.
- After each plan step, proceed step by step and stop at the end of each step with documenting in Readme.md inside the project's folder. Do not modify root Readme.md: 
    - What changed?
    - How to test it?
    - Commit each step with a summary message.

### Plan
  1. Discovery And Target Folder
      - Find the empty Brave plugin folder under projects.
      - Treat this as a Chromium/Brave browser extension, not a Codex plugin and not based on the Firefox project.
      - Confirm the target folder is empty or only contains placeholders.
      - Establish a minimal Manifest V3 Brave extension structure from Chromium extension conventions: manifest.json, background/service worker or popup as needed, UI files, and docs.
      - Decide the simplest user flow for the requested behavior, likely a popup with a textarea for comma/newline-separated links plus a download action.
      - Document the baseline assumptions and setup steps.
      - Then I’ll ask you to test the baseline plugin. Ask you if the tests passed, or if there is need for any changes.
      - Once the tests pass, with your approval, I will document the changes and make a commit.
  2. Link Input And Parsing
      - Implement prompting for a list of links.
      - Accept links separated by new lines, commas, or mixed whitespace.
      - Validate/normalize URLs and report invalid entries without silently failing.
      - Then I’ll ask you to test sample comma-separated and newline-separated input or if there is need for any changes.
      - Once the tests pass, with your approval, I will document the changes and make a commit.
  3. Download And Folder Naming
      - Download each valid URL.
      - Determine the most frequently occurring base URL/host.
      - Create a folder under ~/Downloads named from that base URL.
      - Save downloaded files there with collision-safe names.
      - Then I’ll ask you to test real downloads or if there is need for any changes.
      - Once the tests pass, with your approval, I will document the changes and make a commit.
  4. Docs, Verification, And Polish
      - Add user-facing documentation in the repo docs.
      - Document implementation steps, usage, examples, edge cases, and any limitations.
      - Run available tests/typechecks/build checks.
      - Then I’ll ask you to do a final plugin test or if there is need for any changes.
      - Once the tests pass, with your approval, I will document the changes and make the final commit.
