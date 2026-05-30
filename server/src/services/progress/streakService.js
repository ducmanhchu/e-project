import { CreditTransaction } from "@server/models/payment/CreditTransaction";
import { checkinDateVN, subtractDayVN } from "@server/helpers/dateVN";
import { TRANSACTION_TYPE } from "@server/const/payment";

export async function getCurrentStreak(userId) {
  const rows = await CreditTransaction.aggregate([
    {
      $match: {
        userId,
        type: {
          $in: [
            TRANSACTION_TYPE.CHARGE_SUBMIT,
            TRANSACTION_TYPE.DAILY_CHECKIN,
          ],
        },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
            timezone: "+07:00",
          },
        },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  if (!rows.length) return 0;

  const days = rows.map((r) => r._id);
  const today = checkinDateVN();
  const yesterday = checkinDateVN(new Date(Date.now() - 86400_000));

  if (days[0] !== today && days[0] !== yesterday) return 0;

  let current = 0;
  let expect = days[0];
  for (const d of days) {
    if (d !== expect) break;
    current++;
    expect = subtractDayVN(expect);
  }
  return current;
}
