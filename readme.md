# Node Policy API

JavaScript/Node.js implementation for the policy assessment. MongoDB stores Agent, User, Account, PolicyCategory (LOB), PolicyCarrier, Policy, ScheduledMessage, and Message documents in separate collections.

## Setup

1. Install Node.js 18+ and MongoDB.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` and (optionally) `PORT`.
3. Run `npm install` and `npm start`. The supervisor launches the API and monitors its CPU use.

## Task 1: policy data

Upload the provided CSV as multipart form data in the `file` field. Parsing and MongoDB persistence run in a worker thread.



The worker maps the CSV's `agent`, `firstname`, `dob`, `address`, `phone`, `state`, `zip`, `email`, `gender`, `userType`, `account_name`, `category_name`, `company_name`, `policy_number`, `policy_start_date`, and `policy_end_date` columns to their respective collections. Repeated policy numbers are updated, making an import safe to retry.

- `GET /api/policies/search?username=Lura%20Lucca` returns policy records for a user's first name (`firstname` in the CSV), with related records populated. The `username` parameter is an exact, case-insensitive match.
- `GET /api/policies/aggregate` returns each user with policy count and their policy records.

## Task 2: scheduled messages and CPU restart

Submit a future local server time in ISO calendar date and 24-hour time format. The job is stored durably and a message is inserted into the `messages` collection once due; pending jobs are resumed after a process restart.

```sh
curl -X POST http://localhost:3000/api/messages \
  -H 'Content-Type: application/json' \
  -d '{"message":"Follow up","day":"2027-01-15","time":"09:30"}'
```

`src/supervisor.js` samples the API child process CPU every second. At 70% of the machine's total CPU capacity, it terminates and relaunches the API child. The supervisor also restarts the child after an unexpected exit.

Import node-policy.postman_collection.json  in postman to test the API endpoints.