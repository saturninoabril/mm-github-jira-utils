To get test cases from Google spreadsheet, credentials should be set and save at ``credentials/credentials.json``

1. Generate ``data/test_cases.json`` by ``node utils/spreadsheet.js``
- authenticate thru Google.  Note that token will be saved at ``credentials/token.json``.
- verify no error and that the json file is created
2. Create Jira tickets and Github issues by ``node generate.js``
- verify no error
- In case of error, list all the Jira ticket numbers so it can be ran separately to create Github issues by:
  - setting ticket numbers to ``JIRA_ISSUES``
  - running ``node extra/create_github_from_jira_issue.js``