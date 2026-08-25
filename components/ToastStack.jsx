export default function ToastStack({ toasts }) {
  return (
    <div id="toasts" aria-live="polite">
      {toasts.map((t) => (
        // eslint-disable-next-line react/no-danger
        <div className="toast" key={t.id} dangerouslySetInnerHTML={{ __html: t.html }} />
      ))}
    </div>
  );
}
