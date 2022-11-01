---
name: User Stories
about: Use this template for user stories submission
title: "C3 Phase 1: User Stories"
labels: []
assignees: ""
---

Make sure to follow the *Role, Goal, Benefit* framework for the user stories and the *Given/When/Then* framework for the Definitions of Done! For the DoDs, think about both success and failure scenarios. You can also refer to the examples DoDs in [C3 spec](https://sites.google.com/view/ubc-cpsc310-22w1/project/checkpoint-3#h.8c0lkthf1uae).

## User Story 1
As a student, I want to see classes with high averages (>x%), so that I can boost my GPA.

#### Definitions of Done(s)
Scenario 1: Valid search on average >x% 
Given: User is in a channel where bot is listening
When: User invokes bot with average >x%
Then: Bot responds with a list of courses with average >x%

Scenario 2: Invalid search on average >x% 
Given: User is in a channel where bot is listening
When: User invokes bot with invalid average >x% (query result too big, invalid x, etc.)
Then: Bot responds with an error message and some suggestions to fix


## User Story 2
As an administrator, I want to add new datasets, so that course and room information is up to date.

#### Definitions of Done(s)
Scenario 1: Valid dataset is supplied
Given: User (admin) is in a channel where bot is listening 
When: User invokes bot and uploads a valid new dataset  
Then: Bot responds with a success message (if the dataset was successfully added)

Scenario 2: Invalid dataset supplied
Given: User (admin) is in a channel where bot is listening 
When: User invokes bot and uploads an invalid new dataset (or invalid id...)
Then: Bot responds with an error message, that dataset failed to be added

## Others
You may provide any additional user stories + DoDs in this section for general TA feedback.  
But these will not be graded.
