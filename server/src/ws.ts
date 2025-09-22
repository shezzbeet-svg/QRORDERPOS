export let io: any = {
  emit: () => {},
  on: () => {},
  close: () => {}
};

export function init(_server: any) {
  io = {
    emit: () => {},
    on: () => {},
    close: () => {}
  };
  return io;
}
