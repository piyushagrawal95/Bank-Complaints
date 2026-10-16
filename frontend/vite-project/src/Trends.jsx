import { useEffect,useState } from "react"
import { getSpikes } from "./api"
import "./Trends.css"

const GROUPS=[
    {value:"product",label:"Product"},
    {value:"issue","label":"Issue"},
    {value:"company",label:"Company"}
]

function formatChange(pct){
    if(pct==null){
        return "New";
    }
    return `${pct>0?"+":""}${pct}%`;
}

function Trends(){
    const[groupBy,setGroupBy]=useState("product");
    const[data,setData]=useState(null);
    const[loading,setLoading]=useState(true);
    const[error,setError]=useState(null);

    useEffect(()=>{
        let cancelled=false;
        setLoading(true);
        setError(null);
        setData(null);
        getSpikes({group_by:groupBy})
        .then((result)=>{
            if(!cancelled){
                setData(result);
            }
        })
        .catch((err)=>{
            if(!cancelled){
                setError(err.message);
            }
        })
        .finally(()=>{
            if(!cancelled){
                setLoading(false);
            }
        })
        return ()=>{
            cancelled=true;
        }
    },[groupBy]);

    const spikes=data?data.items.filter((i)=>i.is_spike):[];
    const others=data?data.items.filter((i)=>!i.is_spike).slice(0,15):[];
    return (
    <>
      <div className="trend-controls">
        <label htmlFor="group-by">Group by</label>
        <select
          id="group-by"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value)}
        >
          {GROUPS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error">Could not load trends: {error}</div>}
      {loading && <p className="info">Loading...</p>}

      {data && (
        <>
          {data.as_of === null ? (
            <p className="info">There are no complaints yet, so there are no trends.</p>
          ) : (
            <>
              <p className="info">
                Data up to {data.as_of}. A spike means the last {data.window_days} days
                have at least {data.threshold}x the average of the previous{" "}
                {data.baseline_windows} periods, and at least {data.min_count} complaints.
              </p>

              {!data.enough_history && (
                <div className="trend-warning">
                  The data covers less history than the baseline needs, so the
                  results may not be reliable.
                </div>
              )}

              {spikes.length > 0 ? (
                <div className="trend-banner trend-alert">
                  {spikes.length} spike{spikes.length > 1 ? "s" : ""} detected
                </div>
              ) : (
                <div className="trend-banner trend-ok">No spikes detected</div>
              )}

              {spikes.length > 0 && (
                <div className="spike-grid">
                  {spikes.map((s) => (
                    <div className="spike-card" key={s.group}>
                      <div className="spike-name">{s.group}</div>
                      <div className="spike-change">{formatChange(s.change_pct)}</div>
                      <div className="spike-meta">
                        {s.current.toLocaleString()} complaints in the last{" "}
                        {data.window_days} days, usually about{" "}
                        {Math.round(s.baseline_avg).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {others.length > 0 && (
                <>
                  <h2 className="trend-heading">Other groups (top {others.length})</h2>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{GROUPS.find((g) => g.value === groupBy).label}</th>
                          <th>Last {data.window_days} days</th>
                          <th>Usual</th>
                          <th>Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {others.map((o) => (
                          <tr key={o.group}>
                            <td>{o.group}</td>
                            <td>{o.current.toLocaleString()}</td>
                            <td>{Math.round(o.baseline_avg).toLocaleString()}</td>
                            <td>{formatChange(o.change_pct)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}

export default Trends;
