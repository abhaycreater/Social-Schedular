
import {
  ActivityIcon,
  CheckCircleIcon,
  ClockIcon,
  SendIcon,
  Share2Icon,
  TrendingUpIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "../API/axios";

interface DashboardStats {
  scheduled: number;
  published: number;
  connectedAccounts: number;
}

const getArray = (data: any, key: string): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
};

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    scheduled: 0,
    published: 0,
    connectedAccounts: 0,
  });

  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchDashboardData = async () => {
      setLoading(true);
      setErrors([]);

      const results = await Promise.allSettled([
        api.get("/api/posts"),
        api.get("/api/accounts"),
        api.get("/api/activity"),
      ]);

      if (cancelled) return;

      const newErrors: string[] = [];

      // 1. Posts
      if (results[0].status === "fulfilled") {
        const posts = getArray(results[0].value.data, "posts");

        setStats((previous) => ({
          ...previous,
          scheduled: posts.filter(
            (post: any) => post.status === "scheduled"
          ).length,
          published: posts.filter(
            (post: any) => post.status === "published"
          ).length,
        }));
      } else {
        console.error("Posts API failed:", results[0].reason);
        newErrors.push("Could not load post counts.");
      }

      // 2. Connected accounts
      if (results[1].status === "fulfilled") {
        const accounts = getArray(results[1].value.data, "accounts");

        setStats((previous) => ({
          ...previous,
          connectedAccounts: accounts.filter(
            (account: any) => account.status === "connected"
          ).length,
        }));
      } else {
        console.error("Accounts API failed:", results[1].reason);
        newErrors.push("Could not load connected account count.");
      }

      // 3. Recent activity
      if (results[2].status === "fulfilled") {
        setActivities(
          getArray(results[2].value.data, "activities")
        );
      } else {
        console.error("Activity API failed:", results[2].reason);
        newErrors.push("Could not load recent activity.");
      }

      setErrors(newErrors);
      setLoading(false);
    };

    fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = [
    {
      label: "Scheduled Posts",
      value: stats.scheduled,
      icon: ClockIcon,
      trend: "Waiting to publish",
    },
    {
      label: "Published Posts",
      value: stats.published,
      icon: CheckCircleIcon,
      trend: "Published successfully",
    },
    {
      label: "Connected Accounts",
      value: stats.connectedAccounts,
      icon: Share2Icon,
      trend: "Currently connected",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl">Good Morning! 👋</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Here's what's happening with your social accounts today.
        </p>
      </div>

      {/* API errors */}
      {errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-700">
            Some dashboard data could not be loaded.
          </p>
          {errors.map((error) => (
            <p key={error} className="text-sm text-red-600 mt-1">
              {error}
            </p>
          ))}
          <p className="text-xs text-red-500 mt-2">
            Open the browser console and backend terminal to see the
            exact API error.
          </p>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="bg-white hover:bg-red-50 border border-slate-200 rounded-2xl p-5 hover:border-red-200 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl font-medium text-slate-800 tabular-nums">
                  {loading ? "..." : card.value}
                </div>

                <div className="size-11 rounded-xl bg-red-50 flex items-center justify-center">
                  <Icon className="size-5 text-red-500" />
                </div>
              </div>

              <p className="text-sm text-slate-500">{card.label}</p>

              <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <TrendingUpIcon className="size-3" />
                {card.trend}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-900">Recent Activity</h2>
          <span className="text-sm text-slate-400">
            {activities.length} events
          </span>
        </div>

        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="size-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
              <ActivityIcon className="size-6 text-slate-400" />
            </div>

            <p className="text-slate-500">
              {loading ? "Loading activity..." : "No activity yet"}
            </p>

            <p className="text-slate-400 text-sm mt-1 text-center">
              Connect accounts and schedule posts to see events here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {activities.map((activity) => (
              <div
                key={activity._id}
                className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-zinc-100 text-zinc-600">
                  <SendIcon className="size-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                      {activity.status || "Activity"}
                    </span>

                    <span className="text-xs text-slate-400 shrink-0">
                      {activity.createdAt
                        ? new Date(activity.createdAt).toLocaleString()
                        : ""}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600">
                    {activity.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
