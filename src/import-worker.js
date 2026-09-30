const { parentPort, workerData } = require("node:worker_threads");
const fs = require("node:fs");
const mongoose = require("mongoose");
const { parse } = require("csv-parse/sync");
const {
  Agent,
  User,
  Account,
  PolicyCategory,
  PolicyCarrier,
  Policy,
} = require("./models");
const clean = (value) => (typeof value === "string" ? value.trim() : value);
const date = (value) => (value ? new Date(value) : undefined);
const key = (value) => clean(value || "");

async function importRows() {
  await mongoose.connect(workerData.mongoUri);
  const rows = parse(fs.readFileSync(workerData.filePath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    trim: true,
  });
  let imported = 0;
  for (const row of rows) {
    const email = key(row.email).toLowerCase();
    const agentName = key(row.agent),
      accountName = key(row.account_name);
    const categoryName = key(row.category_name),
      companyName = key(row.company_name),
      policyNumber = key(row.policy_number);
    if (!policyNumber || !categoryName || !companyName) continue;
    const [agent, user, account, category, carrier] = await Promise.all([
      agentName
        ? Agent.findOneAndUpdate(
            { agentName },
            { $setOnInsert: { agentName } },
            { upsert: true, new: true },
          )
        : null,
      email
        ? User.findOneAndUpdate(
            { email },
            {
              $set: {
                firstName: key(row.firstname),
                dob: date(row.dob),
                address: key(row.address),
                phone: key(row.phone),
                state: key(row.state),
                zipCode: key(row.zip),
                email,
                gender: key(row.gender),
                userType: key(row.userType),
              },
            },
            { upsert: true, new: true },
          )
        : User.create({
            firstName: key(row.firstname),
            dob: date(row.dob),
            address: key(row.address),
            phone: key(row.phone),
            state: key(row.state),
            zipCode: key(row.zip),
            gender: key(row.gender),
            userType: key(row.userType),
          }),
      accountName
        ? Account.findOneAndUpdate(
            { accountName },
            { $setOnInsert: { accountName } },
            { upsert: true, new: true },
          )
        : null,
      PolicyCategory.findOneAndUpdate(
        { categoryName },
        { $setOnInsert: { categoryName } },
        { upsert: true, new: true },
      ),
      PolicyCarrier.findOneAndUpdate(
        { companyName },
        { $setOnInsert: { companyName } },
        { upsert: true, new: true },
      ),
    ]);
    await Policy.findOneAndUpdate(
      { policyNumber },
      {
        $set: {
          policyNumber,
          policyStartDate: date(row.policy_start_date),
          policyEndDate: date(row.policy_end_date),
          policyCategoryId: category._id,
          companyId: carrier._id,
          userId: user._id,
          ...(agent && { agentId: agent._id }),
          ...(account && { accountId: account._id }),
          premiumAmount:
            Number(row.premium_amount || row.premium_amount_written) ||
            undefined,
          policyType: key(row.policy_type),
        },
      },
      { upsert: true, new: true },
    );
    imported++;
  }
  parentPort.postMessage({ imported, rows: rows.length });
}
importRows()
  .catch((error) => {
    parentPort.postMessage({ error: error.message });
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
