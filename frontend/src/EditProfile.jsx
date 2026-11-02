import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, ChevronDown, Mail, MapPin, Phone, Search, ShoppingCart, User } from "lucide-react";
import "./EditProfile.css";

const EMPTY = { fullName: "", email: "", phone: "", address: "", photoUrl: null };

// Same rules as the backend, so people see errors before the request is sent.
const validate = (f) => {
  const e = {};
  if (!f.fullName.trim()) e.fullName = "Enter your full name.";
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email address.";
  if (!/^(\+63|0)9\d{9}$/.test(f.phone.replace(/\s/g, ""))) e.phone = "Enter a valid PH mobile number, like +63 912 345 6789.";
  if (!f.address.trim()) e.address = "Enter your delivery address.";
  return e;
};

const FIELDS = [
  { name: "fullName", label: "Full Name", Icon: User, type: "text" },
  { name: "email", label: "Email Address", Icon: Mail, type: "email" },
  { name: "phone", label: "Phone Number", Icon: Phone, type: "tel" },
  { name: "address", label: "Delivery Address", Icon: MapPin, type: "text" },
];

function Avatar({ url, size }) {
  return url ? <img src={url} alt="" className="avatar-img" style={{ width: size, height: size }} />
    : <div className="avatar-fallback" style={{ width: size, height: size }}><User size={size * 0.5} /></div>;
}

export default function EditProfile() {
  const [saved, setSaved] = useState(EMPTY);   // what the server has
  const [form, setForm] = useState(EMPTY);     // what the person is typing
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);  // { type: "ok" | "error", msg }
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  // Load the profile when the page opens.
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => { setSaved(d); setForm(d); })
      .catch(() => setStatus({ type: "error", msg: "Couldn't load your profile. Refresh to try again." }));
  }, []);

  // Update the form as the person types.
  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
    setStatus(null);
  };

  // Validate, then send the changes to the backend.
  const onSave = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErrors(data.errors || {}); return; }
      setSaved(data); setForm(data);
      setStatus({ type: "ok", msg: "Changes saved." });
    } catch {
      setStatus({ type: "error", msg: "Couldn't save your changes. Check your connection and try again." });
    } finally { setSaving(false); }
  };

  // Cancel puts the form back to the last saved version.
  const onCancel = () => { setForm(saved); setErrors({}); setStatus(null); };

  // Upload a new photo as soon as one is chosen.
  const onPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const body = new FormData();
    body.append("photo", file);
    const res = await fetch("/api/profile/photo", { method: "POST", body });
    const data = await res.json();
    if (!res.ok) return setStatus({ type: "error", msg: data.message });
    setSaved((s) => ({ ...s, photoUrl: data.photoUrl }));
    setForm((f) => ({ ...f, photoUrl: data.photoUrl }));
    setStatus({ type: "ok", msg: "Photo updated." });
  };

  return (
    <div className="page">

      <main className="content">
                <button className="back" type="button" aria-label="Go back"><ArrowLeft size={26} /></button>

        <form className="card" onSubmit={onSave} noValidate>
          <div className="avatar-wrap">
            <Avatar url={form.photoUrl} size={138} />
            <button type="button" className="camera" aria-label="Change photo" onClick={() => fileRef.current.click()}>
              <Camera size={18} />
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onPhoto} />
          </div>
          <h1>{saved.fullName}</h1>
          <p className="sub">Manage your personal information</p>

          {FIELDS.map(({ name, label, Icon, type }) => (
            <div className="field" key={name}>
              <Icon className="field-icon" size={28} strokeWidth={1.5} />
              <div className="field-body">
                <label htmlFor={name}>{label}</label>
                <input id={name} name={name} type={type} value={form[name]} onChange={onChange}
                  aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-err` : undefined} />
                {errors[name] && <span className="err" id={`${name}-err`}>{errors[name]}</span>}
              </div>
            </div>
          ))}

          <div className="actions">
            {status && <span className={`status ${status.type}`} role="status">{status.msg}</span>}
            <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn solid" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
          </div>
        </form>
      </main>
    </div>
  );
}