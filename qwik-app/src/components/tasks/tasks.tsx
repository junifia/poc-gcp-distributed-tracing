import { component$, useSignal } from "@builder.io/qwik";

export default component$(() => {
  const tasks = useSignal([]);

  return (
    <div>
      <button
        onClick$={() => {
          tasks.value = [...tasks.value, new Date()];
        }}
      >
        queue
      </button>
      {tasks.value.map((v) => (
        <div>{v.toString()}</div>
      ))}
    </div>
  );
});
