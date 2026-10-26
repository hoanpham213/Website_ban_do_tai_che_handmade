// Tạo phần tử DOM an toàn: chữ luôn đi qua textContent, không dùng innerHTML.
// Cách viết el(tag, props, children) gần với JSX để sau này chuyển sang React dễ hơn.

const SAFE_URL = /^(\/|\.\/|\.\.\/|#|https?:\/\/|mailto:|tel:)/i;

/**
 * @param {string} tag
 * @param {{ className?: string, text?: string|number, attrs?: Record<string, any>, on?: Record<string, Function> }} [props]
 * @param {Array<Node|string|number|null|false>|Node|string} [children]
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  const { className, text, attrs, on } = props;

  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);

  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      if (value === false || value === null || value === undefined) continue;
      if (name.toLowerCase().startsWith('on')) {
        throw new Error(`Không gắn sự kiện qua attrs (${name}); dùng props.on`);
      }
      if ((name === 'href' || name === 'src') && !SAFE_URL.test(String(value))) {
        throw new Error(`URL không an toàn cho ${name}`);
      }
      node.setAttribute(name, value === true ? '' : String(value));
    }
  }

  if (on) {
    for (const [event, handler] of Object.entries(on)) node.addEventListener(event, handler);
  }

  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Thay toàn bộ nội dung của container. */
export function render(container, ...nodes) {
  container.replaceChildren(...nodes.filter(Boolean));
}

/** Lấy tham số trên URL hiện tại. */
export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** Chỉ cho chuyển hướng tới đường dẫn nội bộ (chống open redirect). */
export function safeInternalPath(path, fallback = '/') {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : fallback;
}
