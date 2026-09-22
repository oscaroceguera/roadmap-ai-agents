export type TodoStatus = "pending" | "in_progress" | "completed";
export type TodoItem = { id: string; text: string; status: TodoStatus };

export const MARKS: Record<TodoStatus, string> = {
  pending: "[ ]",
  in_progress: "[>]",
  completed: "[x]",
};

export class TodoManager {
  private items: TodoItem[] = [];

  update(items: TodoItem[]) {
    if (items.length > 20) throw new Error("Max 20 todos allowed");
    if (items.filter((i) => i.status === "in_progress").length > 1) {
      throw new Error("Only one task can be in progress at a time");
    }

    this.items = items;

    return this.render();
  }

  render() {
    if (!this.items.length) return "no todos";

    const list = this.items
      .map((i) => `${MARKS[i.status]} ${i.id} ${i.text}`)
      .join("\n");

    const done = this.items.filter((i) => i.status === "completed").length;

    return `${list}\n\n(${done}/${this.items.length} completed)`;
  }
}
