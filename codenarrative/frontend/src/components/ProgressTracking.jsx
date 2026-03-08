import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { api } from "../api/client.js";
import { useAppContext } from "../context/AppContext.jsx";
import { Card, CardHeader, CardTitle, CardBody } from "./ui/Card.jsx";
import { Skeleton } from "./ui/Skeleton.jsx";

function ProgressTracking() {
  const { currentRepo, userProfile, addToast } = useAppContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!currentRepo) return;
      try {
        setLoading(true);
        const res = await api.getProgress(userProfile.userId, currentRepo.id);
        setData(res);
      } catch (err) {
        addToast({ message: `Failed to load progress: ${err.message}` });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentRepo, userProfile.userId]);

  const derived = data?.derived || { quiz_average: 0, completed_days: 0, time_to_mastery: 14 };
  const completionPct = Math.round((derived.completed_days / 14) * 100);

  const quizChartData =
    data?.quiz_scores?.map((q, idx) => ({ day: q?.day ?? idx + 1, score: (q?.score ?? 0) * 100 })) ?? [];

  const weeklyActivity =
    data?.learning_path_progress?.map((p) => ({
      day: `D${p.day}`,
      value: 1
    })) || [];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(234,179,8,0.12)" }}>
          <span className="material-symbols-outlined" style={{ color: "#eab308", fontSize: 22 }}>bar_chart</span>
        </div>
        <div>
          <h1 className="page-title">Progress Dashboard</h1>
          <p className="page-desc">Track learning path completion, quiz scores, streaks, and explored files.</p>
        </div>
      </div>

      {!currentRepo && (
        <Card className="border-cn-border">
          <CardBody className="text-center py-12">
            <p className="text-cn-muted font-medium">
              Select or analyze a repository from the Dashboard or Repo Analysis to see your progress here.
            </p>
          </CardBody>
        </Card>
      )}

      {loading && currentRepo && (
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      )}

      {data && currentRepo && (
        <>
          <section className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Learning path completion</CardTitle>
              </CardHeader>
              <CardBody className="flex items-center justify-center">
                <div className="relative h-28 w-28">
                  <svg viewBox="0 0 36 36" className="h-full w-full">
                    <path
                      className="text-cn-surface-elevated"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845
                         a 15.9155 15.9155 0 0 1 0 31.831
                         a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-cn-warn"
                      strokeWidth="3"
                      strokeDasharray={`${completionPct}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845
                         a 15.9155 15.9155 0 0 1 0 31.831
                         a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
                    {completionPct}%
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Time to mastery</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-3xl font-semibold">{derived.time_to_mastery}</p>
                <p className="text-xs text-cn-muted">estimated days remaining</p>
                <p className="text-xs text-cn-muted mt-2">
                  Quiz-adjusted based on your average score of{" "}
                  {(derived.quiz_average * 100).toFixed(0)}%.
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Streak & achievements</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2 text-xs">
                <p>
                  <span className="font-semibold">{data.streak_days}</span> day learning streak
                </p>
                <div>
                  <p className="text-cn-muted mb-1">Achievements</p>
                  <div className="flex flex-wrap gap-1">
                    {data.achievements?.map((a) => (
                      <span
                        key={a}
                        className="px-2 py-0.5 rounded-md bg-cn-surface-elevated border border-cn-border text-[10px] text-cn-text"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          </section>

          <section className="grid lg:grid-cols-[1.6fr,1.1fr] gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Quiz scores</CardTitle>
              </CardHeader>
              <CardBody className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={quizChartData}>
                    <XAxis dataKey="day" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--cn-surface)",
                        border: "1px solid var(--cn-border)",
                        borderRadius: 8,
                        fontSize: 11
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Files explored</CardTitle>
              </CardHeader>
              <CardBody className="text-xs space-y-2">
                <p className="text-cn-muted">
                  Heatmap-style list of files you have opened or studied.
                </p>
                <div className="flex flex-wrap gap-1">
                  {data.files_visited?.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 rounded-md bg-cn-surface-elevated border border-cn-border font-mono text-[10px] text-cn-text"
                    >
                      {f}
                    </span>
                  ))}
                </div>
                <div>
                  <p className="text-cn-muted mt-2 mb-1">Concepts mastered</p>
                  <div className="flex flex-wrap gap-1">
                    {data.concepts_mastered?.map((c) => (
                      <span
                        key={c}
                        className="px-2 py-0.5 rounded-md bg-cn-surface-elevated border border-cn-border text-[10px] text-cn-text"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          </section>

          <section className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Weekly activity</CardTitle>
              </CardHeader>
              <CardBody className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyActivity}>
                    <XAxis dataKey="day" stroke="#64748b" fontSize={10} />
                    <YAxis hide />
                    <Bar dataKey="value" fill="#eab308" />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

export default ProgressTracking;

