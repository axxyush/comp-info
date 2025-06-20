import React, { useState } from "react";
import toast from "react-hot-toast";

function AddEvent() {
  const [searchResult, setSearchResult] = useState(null);
  const [addSerialSerial, setAddSerialSerial] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [statusField, setStatusField] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [renamedFrom, setRenamedFrom] = useState("");
  const [renamedTo, setRenamedTo] = useState("");
  const [manufacture, setManufacture] = useState("");
  const [model, setModel] = useState("");
  const [description, setDescription] = useState("");
  const [eventError, setEventError] = useState("");

  const API_BASE = "http://localhost:3001";

  const handleAddEvent = async (e) => {
    e.preventDefault();
    setEventError("");
    const serialRaw = addSerialSerial.trim().toUpperCase();
    if (!serialRaw) {
      setEventError("Enter a serial number");
      return;
    }

    if (
      !eventDate.trim() ||
      !statusField.trim() ||
      !currentName.trim() ||
      !renamedFrom.trim() ||
      !renamedTo.trim() ||
      !manufacture.trim() ||
      !model.trim() ||
      !description.trim()
    ) {
      setEventError('All fields are mandatory; type "N/A" if not applicable');
      return;
    }

    const dt = new Date(eventDate);
    if (isNaN(dt.getTime())) {
      setEventError("Invalid date format");
      return;
    }
    const body = {
      event_date: eventDate,
      status: statusField,
      current_name: currentName,
      renamed_from: renamedFrom,
      renamed_to: renamedTo,
      manufacture: manufacture,
      model: model,
      description: description,
    };
    try {
      const res = await fetch(`${API_BASE}/serials/${serialRaw}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 201) {
        toast.success(`Event added for ${serialRaw}`);
        setAddSerialSerial("");
        setEventDate("");
        setStatusField("");
        setCurrentName("");
        setRenamedFrom("");
        setRenamedTo("");
        setManufacture("");
        setModel("");
        setDescription("");

        if (searchResult && searchResult.serial.serial_number === serialRaw) {
          try {
            const resHist = await fetch(
              `${API_BASE}/serials/${serialRaw}/history`
            );
            const dataHist = await resHist.json();
            const resStatus = await fetch(
              `${API_BASE}/serials/${serialRaw}/status`
            );
            const dataStatus = await resStatus.json();
            setSearchResult({
              serial: dataStatus,
              history: dataHist.history,
              metrics: { total_events: dataHist.history.length },
            });
          } catch (_) {}
        }
      } else {
        const errData = await res.json();
        toast.error("Add event failed");
        setEventError(errData.error || "Add event failed");
      }
    } catch (err) {
      console.error(err);
      setEventError("Server error");
    }
  };
  return (
    <>
      <div className="mb-4 pt-5 container">
        <h1 className="text-center mt-5">
          <b>Add Event</b>
        </h1>
        {eventError && <div className="text-danger mb-2">{eventError}</div>}

        <form className="p-5" onSubmit={handleAddEvent}>
          {/* Serial */}
          <div className="mb-2">
            <label className="form-label">
              <b>Serial Number</b>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter serial number"
              value={addSerialSerial}
              onChange={(e) => setAddSerialSerial(e.target.value)}
              required
            />
          </div>
          {/* Event Date */}
          <div className="mb-2">
            <label className="form-label">
              <b>Event Date</b>
            </label>
            <input
              type="date"
              className="form-control"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>
          {/* Status */}
          <div className="mb-2">
            <label className="form-label">
              <b>Status</b>
            </label>
            <select
              className="form-select"
              value={statusField}
              onChange={(e) => setStatusField(e.target.value)}
              required
            >
              <option value="" disabled>
                Select status
              </option>
              <option value="Renamed">Renamed</option>
              <option value="Redeploy">Redeploy</option>
              <option value="Disposal">Disposed</option>
            </select>
          </div>

          {/* Current Name */}
          <div className="mb-2">
            <label className="form-label">
              <b>Current Name</b>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder='Enter name or "N/A"'
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              required
            />
          </div>
          {/* Renamed From */}
          <div className="mb-2">
            <label className="form-label">
              <b>Renamed From</b>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder='Enter old name or "N/A"'
              value={renamedFrom}
              onChange={(e) => setRenamedFrom(e.target.value)}
              required
            />
          </div>
          {/* Renamed To */}
          <div className="mb-2">
            <label className="form-label">
              <b>Renamed To</b>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder='Enter new name or "N/A"'
              value={renamedTo}
              onChange={(e) => setRenamedTo(e.target.value)}
              required
            />
          </div>
          {/* Manufacture */}
          <div className="mb-2">
            <label className="form-label">
              <b>Manufacturer</b>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder='Enter manufacturer or "N/A"'
              value={manufacture}
              onChange={(e) => setManufacture(e.target.value)}
              required
            />
          </div>
          {/* Model */}
          <div className="mb-2">
            <label className="form-label">
              <b>Model</b>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder='Enter model or "N/A"'
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
            />
          </div>
          {/* Description */}
          <div className="mb-2">
            <label className="form-label">
              <b>Description</b>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder='e.g. "Computer", "Laptop", "Tablet"'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Add Event
          </button>
        </form>
      </div>
    </>
  );
}

export default AddEvent;
