import { useEffect, useMemo, useState } from 'react';
import {
  Car,
  ChartColumn,
  ChevronDown,
  ChevronRight,
  Clock,
  Fuel,
  Minus,
  Navigation,
  Plus,
  Shield,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Utensils,
  Wrench,
} from 'lucide-react';

const DATA_URL = 'https://sheetdb.io/api/v1/ct04953egebq1';

interface Trip {
  id: string;
  date: string;
  earnings: number;
}

interface Driver {
  id: string;
  name: string;
  vehicle: string;
  plate: string;
  rating: number;
  status: string;
  shiftHours: number;
  daysTracked: number;
  totalEarnings: number;
  fuelCost: number;
  foodCost: number;
  otherCost: number;
  estimatedNet: number;
  trips: Trip[];
}

const EMPTY_DRIVER: Driver = {
  id: '',
  name: '',
  vehicle: '',
  plate: '',
  rating: 0,
  status: 'Offline',
  shiftHours: 0,
  daysTracked: 0,
  totalEarnings: 0,
  fuelCost: 0,
  foodCost: 0,
  otherCost: 0,
  estimatedNet: 0,
  trips: [],
};

const parseAmount = (value: unknown): number => {
  const n = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

type Tab = 'dashboard' | 'drivers' | 'trips';
type TxType = 'fuel' | 'food' | 'other' | 'earning';
type CostField = 'totalEarnings' | 'fuelCost' | 'foodCost' | 'otherCost';

export default function App() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [txType, setTxType] = useState<TxType>('fuel');
  const [txAmount, setTxAmount] = useState('');
  const [newName, setNewName] = useState('');
  const [newVehicle, setNewVehicle] = useState('');
  const [showDriverSelect, setShowDriverSelect] = useState(false);

  const DRIVER_META: Record<string, { vehicle: string; rating: number; status: string }> = {
    Francis: { vehicle: 'Toyota Corolla', rating: 4.9, status: 'Online' },
    Saheed: { vehicle: 'Toyota Corolla', rating: 4.7, status: 'Online' },
  };

  useEffect(() => {
    fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw Error(`Failed to load data (HTTP ${res.status})`);
        return res.json();
      })
      .then((data: Record<string, string>[]) => {
        if (data.length === 0) {
          setLoading(false);
          return;
        }
        const driverNames = Array.from(
          new Set(data.map((row) => (row['Driver Name '] || '').trim()).filter(Boolean))
        );
        const builtDrivers: Driver[] = driverNames.map((name, di) => {
          const rows = data.filter((row) => (row['Driver Name '] || '').trim() === name);
          const totals = { totalEarnings: 0, fuelCost: 0, foodCost: 0, otherCost: 0 };
          const trips: Trip[] = rows.map((row, i) => {
            const earnings = parseAmount(row['Total Earnings']);
            totals.totalEarnings += earnings;
            totals.fuelCost += parseAmount(row['Fuel Cost']);
            totals.foodCost += parseAmount(row.Food);
            totals.otherCost += parseAmount(row['Other Ops']);
            return {
              id: `log-${di}-${i + 1}`,
              date: row.Date || `Day ${i + 1}`,
              earnings: Math.round(earnings),
            };
          });
          const meta = DRIVER_META[name] || { vehicle: 'Unknown', rating: 5, status: 'Online' };
          return {
            id: `drv-${di + 1}`,
            name,
            vehicle: meta.vehicle,
            plate: '---',
            rating: meta.rating,
            status: meta.status,
            shiftHours: rows.length * 8,
            daysTracked: rows.length,
            totalEarnings: Math.round(totals.totalEarnings),
            fuelCost: Math.round(totals.fuelCost),
            foodCost: Math.round(totals.foodCost),
            otherCost: Math.round(totals.otherCost),
            estimatedNet: Math.round(
              totals.totalEarnings - totals.fuelCost - totals.foodCost - totals.otherCost
            ),
            trips,
          };
        });
        setDrivers(builtDrivers);
        const francis = builtDrivers.find((d) => d.name === 'Francis');
        setSelectedId(francis ? francis.id : builtDrivers[0]?.id || '');
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message || 'Could not connect to the data source.');
        setLoading(false);
      });
  }, []);

  const driver = useMemo(
    () => drivers.find((d) => d.id === selectedId) || drivers[0] || EMPTY_DRIVER,
    [drivers, selectedId]
  );

  const grossEarnings = driver.totalEarnings;
  const fuelCost = driver.fuelCost;
  const foodCost = driver.foodCost;
  const otherCost = driver.otherCost || 0;
  const totalExpenses = fuelCost + foodCost + otherCost;
  const netEarnings = driver.estimatedNet;
  const daysTracked = driver.daysTracked;

  const fuelPct = grossEarnings > 0 ? (fuelCost / grossEarnings * 100).toFixed(1) : '0.0';
  const expensePct = grossEarnings > 0 ? (totalExpenses / grossEarnings * 100).toFixed(1) : '0.0';
  const keepPct = grossEarnings > 0 ? (netEarnings / grossEarnings * 100).toFixed(1) : '0.0';

  const adjustAmount = (field: CostField, delta: number) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id === selectedId) {
          const current = d[field] || 0;
          const next = Math.max(0, Math.round(current + delta));
          return { ...d, [field]: next };
        }
        return d;
      })
    );
  };

  const setAmount = (field: CostField, value: string) => {
    const n = parseFloat(value);
    if (isNaN(n) || n < 0) return;
    setDrivers((prev) =>
      prev.map((d) => (d.id === selectedId ? { ...d, [field]: n } : d))
    );
  };

  return (
    <div className="min-h-screen bg-[#0A192F] text-slate-100 font-sans antialiased flex flex-col items-center justify-start p-0 md:p-6 selection:bg-[#FF6600] selection:text-black">
      <div className="w-full max-w-md bg-[#0D2137] min-h-screen md:min-h-[880px] md:max-h-[920px] md:rounded-[36px] shadow-2xl shadow-black/80 flex flex-col border border-slate-800/80 overflow-hidden relative">
        {/* Brand header */}
        <div className="bg-[#0A192F] px-5 py-3 border-b border-[#FF6600]/20 flex items-center gap-2.5 shrink-0">
          <div className="p-1.5 rounded-lg bg-[#FF6600]/15 text-[#FF6600] border border-[#FF6600]/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base text-white tracking-tight leading-none">
              DriveGuard
            </h1>
            <p className="text-[9px] text-[#FF6600] font-bold tracking-[0.18em] uppercase mt-1">
              Driver Fintech
            </p>
          </div>
        </div>

        {/* Driver header */}
        <header className="px-5 pt-4 pb-3 bg-[#0F2540]/90 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                driver.status === 'Online'
                  ? 'bg-emerald-400'
                  : driver.status === 'On Trip'
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`}
            />
            <div>
              <div
                className="flex items-center gap-1.5 cursor-pointer"
                onClick={() => setTab('drivers')}
              >
                <h1 className="font-bold text-base tracking-wide text-white flex items-center gap-1">
                  {driver.name}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Car className="w-3 h-3 text-slate-500" /> {driver.vehicle}
              </p>
            </div>
          </div>
          <button
            onClick={() => setTab('drivers')}
            className="flex items-center gap-1.5 text-xs bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 px-2.5 py-1.5 rounded-full border border-slate-700/60 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-[#FF6600]" />
            <span className="font-medium text-[11px]">Drivers ({drivers.length})</span>
          </button>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-10 h-10 border-3 border-[#FF6600]/30 border-t-[#FF6600] rounded-full animate-spin mb-4" />
              <p className="text-sm text-slate-400 font-medium">Loading live driver data…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">
                <Wrench className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">Couldn't load data</p>
              <p className="text-xs text-slate-400">{error}</p>
            </div>
          )}

          {!loading && !error && drivers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-sm text-slate-400">No driver records found.</p>
            </div>
          )}

          {/* Dashboard tab */}
          {tab === 'dashboard' && !loading && !error && drivers.length > 0 && (
            <>
              {/* Driver selector */}
              <div className="relative">
                <button
                  onClick={() => setShowDriverSelect((v) => !v)}
                  className="w-full flex items-center justify-between bg-[#112640] border border-slate-800/80 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-slate-700"
                >
                  <span className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-[#FF6600]" />
                    {driver.name}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${showDriverSelect ? 'rotate-180' : ''}`}
                  />
                </button>
                {showDriverSelect && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#112640] border border-slate-800 rounded-xl shadow-xl z-30 overflow-hidden">
                    {drivers.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          setSelectedId(d.id);
                          setShowDriverSelect(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                          d.id === selectedId
                            ? 'bg-[#163150] text-[#FF6600] font-semibold'
                            : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Car className="w-3.5 h-3.5" />
                          {d.name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ₦{d.estimatedNet.toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Net earnings hero */}
              <section className="bg-gradient-to-b from-[#0F2540] to-[#0D2137] rounded-3xl p-5 border border-slate-800/90 shadow-xl relative overflow-hidden text-center">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#FF6600]/10 blur-3xl rounded-full pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF6600]/10 border border-[#FF6600]/30 text-white text-xs font-semibold uppercase tracking-wider mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    Total Net Earnings
                  </div>
                  <div className="flex items-baseline gap-1.5 my-1">
                    <span className="text-5xl sm:text-6xl font-extrabold text-[#FF6600] tracking-tight drop-shadow-[0_0_25px_rgba(255,102,0,0.35)]">
                      ₦{netEarnings.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium px-2">
                    {daysTracked} days tracked
                  </p>
                  <div className="grid grid-cols-3 gap-2 w-full mt-5 pt-4 border-t border-slate-800/80">
                    <div className="bg-[#163150]/60 p-2.5 rounded-xl border border-slate-800/50">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">
                        Gross Earnings
                      </span>
                      <span className="text-sm font-bold text-white">
                        ₦{grossEarnings.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-[#163150]/60 p-2.5 rounded-xl border border-slate-800/50">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">
                        Keep Rate
                      </span>
                      <span className="text-sm font-bold text-[#FF6600]">{keepPct}%</span>
                    </div>
                    <div className="bg-[#163150]/60 p-2.5 rounded-xl border border-slate-800/50">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">
                        Days Tracked
                      </span>
                      <span className="text-sm font-bold text-white">{daysTracked}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Financial breakdown */}
              <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Financial Breakdown
                  </h2>
                  <button
                    onClick={() => setShowQuickLog(true)}
                    className="text-xs text-[#FF6600] hover:underline flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Quick Log
                  </button>
                </div>

                {/* Total earnings */}
                <div className="bg-[#112640] rounded-2xl p-4 border border-slate-800/80 shadow-md transition-all hover:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-white">Total Earnings</h3>
                        <p className="text-[11px] text-slate-400">Total ride fares & tips</p>
                      </div>
                    </div>
                    <span className="text-base font-bold text-emerald-400">
                      ₦{grossEarnings.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => adjustAmount('totalEarnings', -1000)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Subtract ₦1,000"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                        ₦
                      </span>
                      <input
                        type="number"
                        value={grossEarnings || ''}
                        onChange={(e) => setAmount('totalEarnings', e.target.value)}
                        className="w-full bg-[#0A1A2E] border border-slate-800 rounded-lg py-1.5 pl-7 pr-3 text-sm text-white font-semibold focus:outline-none focus:border-[#FF6600]"
                      />
                    </div>
                    <button
                      onClick={() => adjustAmount('totalEarnings', 1000)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Add ₦1,000"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Fuel cost */}
                <div className="bg-gradient-to-b from-[#1A2F4D] to-[#112640] rounded-2xl p-5 border-2 border-amber-500/30 shadow-lg shadow-amber-900/20 transition-all hover:border-amber-500/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Fuel className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Fuel Cost</h3>
                        <p className="text-[11px] text-slate-400">Petrol / Gas expenses</p>
                      </div>
                    </div>
                    <span className="text-2xl font-extrabold text-amber-400">
                      -₦{fuelCost.toLocaleString()}{' '}
                      <span className="text-base">({fuelPct}%)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => adjustAmount('fuelCost', -500)}
                      className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                        ₦
                      </span>
                      <input
                        type="number"
                        value={fuelCost || ''}
                        onChange={(e) => setAmount('fuelCost', e.target.value)}
                        className="w-full bg-[#0A1A2E] border border-slate-800 rounded-lg py-2 pl-7 pr-3 text-base text-white font-semibold focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <button
                      onClick={() => adjustAmount('fuelCost', 500)}
                      className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Food cost */}
                <div className="bg-[#112640] rounded-xl p-2.5 border border-slate-800/80 shadow-sm transition-all hover:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <Utensils className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="text-[11px] font-semibold text-white">Food</h3>
                        <p className="text-[10px] text-slate-400">Meals & refreshments</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-rose-400">
                      -₦{foodCost.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1.5">
                    <button
                      onClick={() => adjustAmount('foodCost', -500)}
                      className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                        ₦
                      </span>
                      <input
                        type="number"
                        value={foodCost || ''}
                        onChange={(e) => setAmount('foodCost', e.target.value)}
                        className="w-full bg-[#0A1A2E] border border-slate-800 rounded-md py-1 pl-6 pr-2 text-xs text-white font-semibold focus:outline-none focus:border-rose-400"
                      />
                    </div>
                    <button
                      onClick={() => adjustAmount('foodCost', 500)}
                      className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Other ops */}
                <div className="bg-[#112640] rounded-2xl p-4 border border-slate-800/80 shadow-md transition-all hover:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-white">Other Ops</h3>
                        <p className="text-[11px] text-slate-400">
                          Tolls, car wash & maintenance
                        </p>
                      </div>
                    </div>
                    <span className="text-base font-bold text-cyan-400">
                      -₦{otherCost.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => adjustAmount('otherCost', -500)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                        ₦
                      </span>
                      <input
                        type="number"
                        value={otherCost || ''}
                        onChange={(e) => setAmount('otherCost', e.target.value)}
                        className="w-full bg-[#0A1A2E] border border-slate-800 rounded-lg py-1.5 pl-7 pr-3 text-sm text-white font-semibold focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <button
                      onClick={() => adjustAmount('otherCost', 500)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </section>

              {/* Revenue allocation bar */}
              <section className="bg-[#112640] rounded-2xl p-4 border border-slate-800/80 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <ChartColumn className="w-4 h-4 text-[#FF6600]" /> Revenue Allocation
                  </h3>
                  <span className="text-[11px] text-slate-400">Expenses: {expensePct}%</span>
                </div>
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${Math.min(100, Math.max(0, Number(keepPct)))}%` }}
                    className="bg-[#FF6600] h-full transition-all duration-300"
                    title="Net Keep"
                  />
                  <div
                    style={{ width: `${grossEarnings > 0 ? fuelCost / grossEarnings * 100 : 0}%` }}
                    className="bg-amber-400 h-full transition-all duration-300"
                    title="Fuel"
                  />
                  <div
                    style={{ width: `${grossEarnings > 0 ? foodCost / grossEarnings * 100 : 0}%` }}
                    className="bg-rose-400 h-full transition-all duration-300"
                    title="Food"
                  />
                  <div
                    style={{ width: `${grossEarnings > 0 ? otherCost / grossEarnings * 100 : 0}%` }}
                    className="bg-cyan-400 h-full transition-all duration-300"
                    title="Other Ops"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF6600]" />
                    <span>Net (₦{netEarnings.toLocaleString()})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>Fuel (₦{fuelCost.toLocaleString()})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span>Food (₦{foodCost.toLocaleString()})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <span>Other (₦{otherCost.toLocaleString()})</span>
                  </div>
                </div>
              </section>

              {/* Daily shift log */}
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Daily Shift Log
                  </h2>
                  <span className="text-[11px] text-slate-500">
                    {driver.trips.length} days
                  </span>
                </div>
                <div className="space-y-2">
                  {driver.trips.length === 0 ? (
                    <div className="p-6 text-center bg-[#112640] rounded-2xl border border-slate-800/80 text-slate-500 text-xs">
                      No daily records found.
                    </div>
                  ) : (
                    driver.trips.map((trip) => (
                      <div
                        key={trip.id}
                        className="bg-[#112640] p-3 rounded-xl border border-slate-800/80 flex items-center justify-between"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 rounded-lg bg-slate-800 text-slate-400 mt-0.5">
                            <Navigation className="w-3.5 h-3.5 text-[#FF6600]" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-white">{trip.date}</span>
                            <p className="text-[11px] text-slate-400 mt-0.5">Daily Earnings</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-emerald-400">
                          +₦{trip.earnings.toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}

          {/* Drivers tab */}
          {tab === 'drivers' && !loading && !error && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Driver Shift Leaderboard</h2>
                  <p className="text-xs text-slate-400">
                    Select a driver to view or update earnings
                  </p>
                </div>
                <button
                  onClick={() => setShowAddDriver(true)}
                  className="bg-[#FF6600] hover:bg-[#E65C00] text-slate-950 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Driver
                </button>
              </div>
              <div className="space-y-2.5">
                {drivers.map((d) => {
                  const net = d.estimatedNet;
                  const isActive = d.id === selectedId;
                  return (
                    <div
                      key={d.id}
                      onClick={() => {
                        setSelectedId(d.id);
                        setTab('dashboard');
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                        isActive
                          ? 'bg-[#163150] border-[#FF6600] ring-1 ring-[#FF6600]/30'
                          : 'bg-[#112640] border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold text-white">{d.name}</h3>
                              {isActive && (
                                <span className="text-[10px] bg-[#FF6600]/20 text-[#FF6600] px-2 py-0.5 rounded-full font-semibold">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">{d.vehicle}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                              <span>★ {d.rating}</span>
                              <span>•</span>
                              <span>{d.daysTracked} Days</span>
                              <span>•</span>
                              <span>{d.shiftHours} hrs online</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-medium block">
                            Net Earned
                          </span>
                          <span className="text-base font-extrabold text-[#FF6600]">
                            ₦{net.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trips tab */}
          {tab === 'trips' && !loading && !error && drivers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">{driver.name}'s Shift Logs</h2>
                  <p className="text-xs text-slate-400">Detailed ride history & breakdown</p>
                </div>
              </div>
              <div className="bg-[#112640] p-4 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-[#0A1A2E] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Gross Revenue</span>
                    <span className="text-lg font-bold text-emerald-400">
                      ₦{driver.totalEarnings.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-[#0A1A2E] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Total Shift Expense</span>
                    <span className="text-lg font-bold text-rose-400">
                      ₦{(driver.fuelCost + driver.foodCost + (driver.otherCost || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="border-t border-slate-800/80 pt-3">
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">
                    Shift Expense Details
                  </h4>
                  <div className="flex items-center justify-between text-xs text-slate-400 py-1 border-b border-slate-800/40">
                    <span className="flex items-center gap-1.5">
                      <Fuel className="w-3.5 h-3.5 text-amber-400" /> Fuel Cost
                    </span>
                    <span className="font-semibold text-slate-200">
                      ₦{driver.fuelCost.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 py-1 border-b border-slate-800/40">
                    <span className="flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-rose-400" /> Food & Meals
                    </span>
                    <span className="font-semibold text-slate-200">
                      ₦{driver.foodCost.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 py-1">
                    <span className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-cyan-400" /> Other Ops
                    </span>
                    <span className="font-semibold text-slate-200">
                      ₦{(driver.otherCost || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2">
                Daily Records
              </h3>
              {driver.trips.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-[#112640] p-3.5 rounded-xl border border-slate-800/80 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-white">{trip.date}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Daily Earnings</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">
                    +₦{trip.earnings.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Bottom nav */}
        <nav className="bg-[#0F2540]/95 backdrop-blur-md border-t border-slate-800/80 px-6 py-2.5 flex items-center justify-around sticky bottom-0 z-20">
          <button
            onClick={() => setTab('dashboard')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              tab === 'dashboard' ? 'text-[#FF6600]' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] font-medium">Dashboard</span>
          </button>
          <button
            onClick={() => setTab('drivers')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              tab === 'drivers' ? 'text-[#FF6600]' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium">Drivers</span>
          </button>
          <button
            onClick={() => setTab('trips')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              tab === 'trips' ? 'text-[#FF6600]' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px] font-medium">Shift Log</span>
          </button>
        </nav>

        {/* Quick log modal */}
        {showQuickLog && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-[#112640] border border-slate-800 w-full rounded-2xl p-5 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Log Quick Transaction</h3>
                <button
                  onClick={() => setShowQuickLog(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const amt = parseFloat(txAmount);
                  if (!amt || amt <= 0) return;
                  if (txType === 'fuel') adjustAmount('fuelCost', amt);
                  else if (txType === 'food') adjustAmount('foodCost', amt);
                  else if (txType === 'other') adjustAmount('otherCost', amt);
                  else if (txType === 'earning') adjustAmount('totalEarnings', amt);
                  setTxAmount('');
                  setShowQuickLog(false);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Select Type</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setTxType('fuel')}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border ${
                        txType === 'fuel'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Fuel className="w-3.5 h-3.5" /> Fuel
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('food')}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border ${
                        txType === 'food'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Utensils className="w-3.5 h-3.5" /> Food
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTxType('other')}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border ${
                        txType === 'other'
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" /> Other Ops
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('earning')}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border ${
                        txType === 'earning'
                          ? 'bg-[#FF6600]/20 border-[#FF6600] text-[#FF6600]'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" /> Fare
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Amount (₦)</label>
                  <input
                    type="number"
                    step="100"
                    placeholder="0"
                    required
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full bg-[#0A1A2E] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#FF6600] hover:bg-[#E65C00] text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Add Transaction
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Add driver modal */}
        {showAddDriver && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-[#112640] border border-slate-800 w-full rounded-2xl p-5 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Add New Driver</h3>
                <button
                  onClick={() => setShowAddDriver(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newName.trim()) return;
                  const newDriver: Driver = {
                    id: `drv-${Date.now()}`,
                    name: newName,
                    vehicle: newVehicle || 'Toyota Corolla',
                    plate: `LAG-${Math.floor(100 + Math.random() * 900)}-XY`,
                    rating: 5,
                    status: 'Online',
                    shiftHours: 1,
                    daysTracked: 0,
                    totalEarnings: 0,
                    fuelCost: 0,
                    foodCost: 0,
                    otherCost: 0,
                    estimatedNet: 0,
                    trips: [],
                  };
                  setDrivers((prev) => [...prev, newDriver]);
                  setSelectedId(newDriver.id);
                  setNewName('');
                  setNewVehicle('');
                  setShowAddDriver(false);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Driver Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Babatunde"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-[#0A1A2E] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Vehicle Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota Camry"
                    value={newVehicle}
                    onChange={(e) => setNewVehicle(e.target.value)}
                    className="w-full bg-[#0A1A2E] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF6600]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#FF6600] hover:bg-[#E65C00] text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Create Driver Profile
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
