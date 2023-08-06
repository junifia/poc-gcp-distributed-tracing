import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import Tasks from "../components/tasks/tasks";

export default component$(() => {
  return <Tasks />;
});

export const head: DocumentHead = {
  title: "task queueing",
  meta: [
    {
      name: "why",
      content: "for blog",
    },
  ],
};
