import React, { useState } from "react";
import toast from "react-hot-toast";

function Home() {
  const [searchSerial, setSearchSerial] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [deleteSerial, setDeleteSerial] = useState("");

  const API_BASE = "http://localhost:3001";

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchResult(null);
    const serial = searchSerial.trim().toUpperCase();
    if (!serial) {
      toast.error("Enter a serial number");
      return;
    }
    try {
      // Fetch history
      const resHist = await fetch(`${API_BASE}/serials/${serial}/history`);
      if (resHist.status === 404) {
        toast.error("Serial not found");
        return;
      }
      if (!resHist.ok) throw new Error("Server error");
      toast.success(`Serial ${serial} found`);
      const dataHist = await resHist.json(); // { history: [...] }

      // Fetch status
      const resStatus = await fetch(`${API_BASE}/serials/${serial}/status`);
      if (!resStatus.ok) {
        if (resStatus.status === 404) {
          toast.error("Serial not found");
          return;
        }
        throw new Error("Server error");
      }
      const dataStatus = await resStatus.json();

      setSearchResult({
        serial: dataStatus,
        history: dataHist.history,
        metrics: { total_events: dataHist.history.length },
      });
    } catch (err) {
      console.error(err);
      toast.error("Error fetching data");
    }
  };

  // --- Delete handler ---
  const handleDelete = async (e) => {
    e.preventDefault();
    const serial = deleteSerial.trim().toUpperCase();
    if (!serial) {
      toast.error("Enter a serial to delete");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/serials/${serial}`, {
        method: "DELETE",
      });
      if (res.status === 200) {
        toast.success(`Serial ${serial} deleted`);
        if (searchResult && searchResult.serial.serial_number === serial) {
          setSearchResult(null);
        }
      } else if (res.status === 404) {
        toast.error("Serial not found");
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Delete failed");
      }
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    }
  };

  // --- Render history and its Add Event form ---
  const renderHistory = () => {
    if (!searchResult) return null;
    const { serial, history, metrics } = searchResult;
    return (
      <div className="mt-4">
        <h5>Serial: {serial.serial_number}</h5>
        <p>
          Current Name: <strong>{serial.current_name || "N/A"}</strong> |
          Status: <strong>{serial.current_status}</strong> | Last Event Date:{" "}
          {serial.last_event_date
            ? new Date(serial.last_event_date).toLocaleDateString()
            : "N/A"}
        </p>
        <p>Total events: {metrics.total_events}</p>
        {history.length === 0 ? (
          <p>No history events.</p>
        ) : (
          history.map((ev) => (
            <div
              key={ev.event_id}
              className={`card mb-2 border ${
                ev.status === "Disposed" ? "border-danger" : ""
              } ${ev.status === "Redeploy" ? "border-success" : ""} ${
                ev.status === "Renamed" ? "border-warning" : ""
              }`}
            >
              <div className="card-body">
                <h6 className="card-title">
                  {ev.status} on{" "}
                  <b>{new Date(ev.event_date).toLocaleDateString()}</b>
                </h6>
                {ev.current_name && (
                  <p className="card-text">
                    <strong>Current Name:</strong> {ev.current_name}
                  </p>
                )}

                {ev.renamed_from && ev.renamed_to && (
                  <p className="card-text">
                    Renamed from{" "}
                    <em>
                      <b>{ev.renamed_from}</b>
                    </em>{" "}
                    to{" "}
                    <em>
                      <b>{ev.renamed_to}</b>
                    </em>
                  </p>
                )}
                {ev.manufacture && (
                  <p className="card-text">
                    <strong>Manufacturer:</strong> {ev.manufacture}
                  </p>
                )}
                {ev.model && (
                  <p className="card-text">
                    <strong>Model:</strong> {ev.model}
                  </p>
                )}
                {ev.description && (
                  <p className="card-text">
                    <strong>Description:</strong> {ev.description}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="container py-4 pt-5">
      {/* Search Form */}
      <h5 className="pt-5">Search a Computer by Serial Number</h5>
      <form className="d-flex mb-2 " role="search" onSubmit={handleSearch}>
        <input
          className="form-control me-2"
          type="search"
          placeholder="Search serial..."
          aria-label="Search"
          value={searchSerial}
          onChange={(e) => setSearchSerial(e.target.value)}
        />
        <button className="btn btn-outline-success" type="submit">
          Search
        </button>
      </form>
      {renderHistory()}

      <hr className="my-4" />

      <h5>Delete a Computer by Serial Number</h5>
      <form className="d-flex align-items-start mb-5" onSubmit={handleDelete}>
        <input
          className="form-control me-2"
          type="text"
          placeholder="Serial to delete..."
          value={deleteSerial}
          onChange={(e) => setDeleteSerial(e.target.value)}
        />
        <button className="btn btn-danger" type="submit">
          Delete
        </button>
      </form>
    </div>
  );
}

export default Home;
