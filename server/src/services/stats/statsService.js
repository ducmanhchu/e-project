import { Order } from "@server/models/payment/Order";
import User from "@server/models/user/User";
import { PAYMENT_STATUS } from "@server/const/payment";
import { USER_ROLE } from "@server/const/user";
import { STATS_GRANULARITY, DEFAULT_PERIODS } from "@server/const/stats";
import { checkinDateVN } from "@server/helpers/dateVN";
import { ApiError } from "@server/helpers/ApiError";

const VALID_GRANULARITY = new Set(Object.values(STATS_GRANULARITY));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function startOfVNDay(ymd) {
  return new Date(`${ymd}T00:00:00.000+07:00`);
}

function endOfVNDay(ymd) {
  return new Date(`${ymd}T23:59:59.999+07:00`);
}

// Resolve the active window. Precedence: allTime > from/to > default DEFAULT_PERIODS.
function resolveWindow({ groupBy, from, to, allTime }) {
  if (allTime) {
    return { fromDate: new Date(0), toDate: new Date() };
  }

  if (from && !DATE_RE.test(from)) {
    throw ApiError.badRequest("from must be YYYY-MM-DD");
  }
  if (to && !DATE_RE.test(to)) {
    throw ApiError.badRequest("to must be YYYY-MM-DD");
  }

  const toDate = to ? endOfVNDay(to) : new Date();

  let fromDate;
  if (from) {
    fromDate = startOfVNDay(from);
  } else if (groupBy === STATS_GRANULARITY.MONTH) {
    fromDate = new Date(toDate);
    fromDate.setMonth(fromDate.getMonth() - DEFAULT_PERIODS);
  } else {
    fromDate = new Date(toDate.getTime() - DEFAULT_PERIODS * 7 * 86400000);
  }

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw ApiError.badRequest("invalid date range");
  }
  if (fromDate.getTime() > toDate.getTime()) {
    throw ApiError.badRequest("from must be <= to");
  }

  return { fromDate, toDate };
}

// Revenue + paid-order count + distinct payers. `extraMatch` adds e.g. a paidAt window.
function paidOrdersPipeline(extraMatch = {}) {
  return [
    { $match: { status: PAYMENT_STATUS.PAID, ...extraMatch } },
    {
      $group: {
        _id: null,
        revenueVND: { $sum: "$packSnapshot.price" },
        transactionCount: { $sum: 1 },
        payers: { $addToSet: "$userId" },
      },
    },
    {
      $project: {
        _id: 0,
        revenueVND: 1,
        transactionCount: 1,
        payingUsers: { $size: "$payers" },
      },
    },
  ];
}

function userGrowthPipeline(groupBy, fromDate, toDate) {
  return [
    {
      $match: {
        role: USER_ROLE.USER,
        createdAt: { $gte: fromDate, $lte: toDate },
      },
    },
    {
      $group: {
        _id: {
          $dateTrunc: {
            date: "$createdAt",
            unit: groupBy,
            timezone: "+07:00",
            startOfWeek: "monday",
          },
        },
        newUsers: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, periodStart: "$_id", newUsers: 1 } },
  ];
}

export async function getOverview({ groupBy, from, to, allTime } = {}) {
  const gran = groupBy ?? STATS_GRANULARITY.WEEK;
  if (!VALID_GRANULARITY.has(gran)) {
    throw ApiError.badRequest("groupBy must be week or month");
  }

  const isAllTime = allTime === true || allTime === "true";
  const { fromDate, toDate } = resolveWindow({
    groupBy: gran,
    from,
    to,
    allTime: isAllTime,
  });

  const [allOrders, totalUsers, rangeOrders, rangeNewUsers, growthRows] =
    await Promise.all([
      Order.aggregate(paidOrdersPipeline()),
      User.countDocuments({ role: USER_ROLE.USER }),
      Order.aggregate(
        paidOrdersPipeline({ paidAt: { $gte: fromDate, $lte: toDate } }),
      ),
      User.countDocuments({
        role: USER_ROLE.USER,
        createdAt: { $gte: fromDate, $lte: toDate },
      }),
      User.aggregate(userGrowthPipeline(gran, fromDate, toDate)),
    ]);

  const all = allOrders[0] ?? {};
  const rng = rangeOrders[0] ?? {};
  const fromEcho = isAllTime ? null : checkinDateVN(fromDate);
  const toEcho = isAllTime ? null : checkinDateVN(toDate);

  return {
    revenueVND: all.revenueVND ?? 0,
    transactionCount: all.transactionCount ?? 0,
    totalUsers,
    payingUsers: all.payingUsers ?? 0,
    range: {
      from: fromEcho,
      to: toEcho,
      revenueVND: rng.revenueVND ?? 0,
      transactionCount: rng.transactionCount ?? 0,
      newUsers: rangeNewUsers,
      payingUsers: rng.payingUsers ?? 0,
    },
    userGrowth: growthRows.map((r) => ({
      periodStart: r.periodStart,
      newUsers: r.newUsers,
    })),
  };
}
