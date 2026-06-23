import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";

const PALETTE = ["#6366f1","#22d3ee","#a78bfa","#34d399","#f59e0b","#f87171","#60a5fa","#fb923c"];

const tooltipStyle = {
  backgroundColor:"#fff",
  border:"1px solid #e2e8f0",
  borderRadius:12,
  boxShadow:"0 4px 20px rgba(15,23,42,.08)",
  fontSize:12,
  fontWeight:600,
};

export function DeptHoursBar({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top:4,right:8,left:-10,bottom:4 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
        <XAxis dataKey="department" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
        <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill:"#f8fafc" }}/>
        <Bar dataKey="hours" name="Learning Hours" radius={[6,6,0,0]}>
          {data.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyTrendArea({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top:4,right:8,left:-10,bottom:4 }}>
        <defs>
          <linearGradient id="gradHours" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="gradComp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.15}/>
            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
        <XAxis dataKey="month" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
        <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
        <Tooltip contentStyle={tooltipStyle}/>
        <Area type="monotone" dataKey="hours" name="Hours" stroke="#6366f1" strokeWidth={2} fill="url(#gradHours)"/>
        <Area type="monotone" dataKey="completions" name="Completions" stroke="#22d3ee" strokeWidth={2} fill="url(#gradComp)"/>
        <Legend wrapperStyle={{ fontSize:11 }}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CompletionDonut({ completed, total }: { completed: number; total: number }) {
  const remaining = Math.max(0, total - completed);
  const chartData = [
    { name:"Completed", value: completed },
    { name:"Remaining", value: remaining },
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
          <Cell fill="#6366f1"/>
          <Cell fill="#f1f5f9"/>
        </Pie>
        <Tooltip contentStyle={tooltipStyle}/>
        <Legend wrapperStyle={{ fontSize:11 }}/>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CourseParticipationBar({ data }: { data: any[] }) {
  const trimmed = data.map((d: any) => ({ ...d, course: d.course.length > 22 ? d.course.slice(0,22)+"…" : d.course }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={trimmed} layout="vertical" margin={{ top:4,right:20,left:4,bottom:4 }} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
        <XAxis type="number" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
        <YAxis type="category" dataKey="course" tick={{ fontSize:11, fill:"#64748b" }} axisLine={false} tickLine={false} width={130}/>
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill:"#f8fafc" }}/>
        <Bar dataKey="participants" name="Participants" radius={[0,6,6,0]}>
          {trimmed.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SkillGapBar({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top:4,right:8,left:-10,bottom:4 }} barGap={2} barSize={12}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
        <XAxis dataKey="skill" tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
        <YAxis domain={[0,100]} tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
        <Tooltip contentStyle={tooltipStyle}/>
        <Legend wrapperStyle={{ fontSize:11 }}/>
        <Bar dataKey="current" name="Current" fill="#6366f1" radius={[4,4,0,0]}/>
        <Bar dataKey="target" name="Target" fill="#e0e7ff" radius={[4,4,0,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EffectivenessLine({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top:4,right:8,left:-10,bottom:4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
        <XAxis dataKey="department" tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
        <YAxis domain={[0,100]} tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
        <Tooltip contentStyle={tooltipStyle}/>
        <Line type="monotone" dataKey="score" name="Score" stroke="#a78bfa" strokeWidth={2.5} dot={{ r:4, fill:"#a78bfa", strokeWidth:0 }}/>
      </LineChart>
    </ResponsiveContainer>
  );
}

export function WorkforceProgressDonut({ actual, remaining }: { actual: number; remaining: number }) {
  const chartData = [
    { name: "Actual Hours", value: actual },
    { name: "Remaining Hours", value: remaining },
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
          <Cell fill="#6366f1"/>
          <Cell fill="#fda4af"/>
        </Pie>
        <Tooltip contentStyle={tooltipStyle}/>
        <Legend wrapperStyle={{ fontSize:11 }}/>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DeptContributionDonut({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="hours" nameKey="department">
          {data.map((_: any, index: number) => (
            <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle}/>
        <Legend wrapperStyle={{ fontSize:10 }} layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TargetVsActualDeptBar({ data, targetPerEmployee }: { data: any[]; targetPerEmployee: number }) {
  const chartData = data.map((d: any) => ({
    department: d.department,
    Actual: d.hours,
    Target: d.employees * targetPerEmployee,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top:4,right:8,left:-10,bottom:4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
        <XAxis dataKey="department" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
        <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
        <Tooltip contentStyle={tooltipStyle}/>
        <Legend wrapperStyle={{ fontSize:11 }}/>
        <Bar dataKey="Target" fill="#e2e8f0" radius={[4,4,0,0]} barSize={16} />
        <Bar dataKey="Actual" fill="#6366f1" radius={[4,4,0,0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RemainingHoursDeptBar({ data, targetPerEmployee }: { data: any[]; targetPerEmployee: number }) {
  const chartData = data
    .map((d: any) => ({
      department: d.department,
      remaining: Math.max(0, (d.employees * targetPerEmployee) - d.hours),
    }))
    .sort((a: any, b: any) => b.remaining - a.remaining);
  
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top:4,right:8,left:-10,bottom:4 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
        <XAxis dataKey="department" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
        <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
        <Tooltip contentStyle={tooltipStyle}/>
        <Bar dataKey="remaining" name="Remaining Hours" fill="#f87171" radius={[6,6,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyTrendActualVsTarget({ data, totalEmployees }: { data: any[]; totalEmployees: number }) {
  const chartData = data.map((d: any) => ({
    month: d.month,
    Actual: d.hours,
    Target: totalEmployees * 1.33,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top:4,right:8,left:-10,bottom:4 }}>
        <defs>
          <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
        <XAxis dataKey="month" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
        <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
        <Tooltip contentStyle={tooltipStyle}/>
        <Legend wrapperStyle={{ fontSize:11 }}/>
        <Area type="monotone" dataKey="Target" name="Monthly Target" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" fill="none" />
        <Area type="monotone" dataKey="Actual" name="Actual Hours" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradActual)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

