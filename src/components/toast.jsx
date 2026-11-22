import { useEffect, useState } from 'react';

let push = () => {};

export function toast(msg) {
  push(msg);
}

export function Toaster() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    let id;
    push = (m) => {
      setMsg(m);
      clearTimeout(id);
      id = setTimeout(() => setMsg(null), 3200);
    };
    return () => clearTimeout(id);
  }, []);
  if (!msg) return null;
  return (
    <div className="toast" role="status">
      {msg}
    </div>
  );
}
