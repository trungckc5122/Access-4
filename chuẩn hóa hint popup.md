# Chuẩn hóa Hint Popup (nổi gần nút "i")

Áp dụng cho toàn bộ file `solution-*.html` trong dự án (Access 3 / Solution
Pre-Intermediate / Solution Intermediate). Mọi file đều load 2 file dùng
chung: `access-theme.css` và `access-core.js` (`<script src="access-core.js">`
luôn nằm **ở cuối file**, sau mọi `<script>` cục bộ).

---

## 0. Sự thật kỹ thuật bắt buộc phải biết trước khi sửa bất kỳ file nào

`access-core.js` tự gán:

```js
window.toggleHint = function (event, id) { ... };
```

→ **Ghi đè hoàn toàn** bất kỳ hàm `toggleHint` nào định nghĩa trong `<script>`
riêng của từng file, bất kể file đó viết logic gì.

**Hệ quả:**
- **Không bao giờ** sửa/viết lại hàm `toggleHint` cục bộ trong file — vô tác
  dụng, hàm chạy thật luôn là bản của `access-core.js`.
- Hàm thật (`access-core.js`) khi được gọi sẽ: tìm `#${id}-hint`, tắt hết
  `.hint-box`/`.inline-hint` khác đang mở, rồi:
  - Nếu phần tử `.hint-box` đó **có class `inline-hint`** → định vị bằng
    `position: fixed` + `getBoundingClientRect()` để luôn hiện đúng vị trí
    cạnh nút bấm, tự tính lại khi cuộn/resize, không phụ thuộc cấu trúc DOM
    cha, không bao giờ bị cắt/tràn ở bất kỳ mép nào của màn hình (trên,
    dưới, trái, phải).
  - Nếu **không có** class `inline-hint` → chỉ `display:block`, vị trí hoàn
    toàn phụ thuộc CSS `.hint-box` gốc (thường là `position:absolute;
    top:100%; left:0` neo theo phần tử cha gần nhất có `position:relative`)
    → **luôn có nguy cơ tràn màn hình** (dưới, hoặc phải, hoặc cả hai) bất
    cứ khi nào câu hỏi đó nằm gần mép trang/mép bảng/mép cột.

## 1. Kết luận chuẩn — KHÔNG CÒN NGOẠI LỆ

> **Mọi `.hint-box` được mở bằng `toggleHint(event, id)` đều phải có class
> `inline-hint`, không có ngoại lệ.**

Đã từng có nhận định sai là "hint đã có wrapper `position:relative` bọc sẵn
(vd `.inline-group`, `.hint-anchor` tự đặt tên khác, hoặc selector lồng 3
cấp như `.label-input-row .row-btns .hint-box`) thì không cần sửa nữa" — **nhận
định này SAI**. Các pattern đó chỉ giải quyết được lỗi định vị *ngang cấp*
(hint hiện lệch sang trái cả dòng do neo nhầm vào container lớn), chứ
**không** giải quyết được lỗi **tràn ra ngoài viewport** (dưới hoặc phải)
khi câu hỏi đó tình cờ nằm gần mép màn hình — vì các pattern đó vẫn dùng
`position: absolute; left: 0` neo cứng theo local anchor, không biết mép
viewport ở đâu. Chỉ có `inline-hint` (dùng `getBoundingClientRect` để tính
theo viewport thực tế) mới tránh được hoàn toàn.

Vì vậy: **bỏ qua mọi phân biệt "đã anchor đúng hay chưa"** — cứ thấy
`.hint-box` nào được mở bằng `toggleHint()` là thêm `inline-hint`.

### Trường hợp KHÔNG áp dụng (không phải `.hint-box` mở qua `toggleHint`)

Có 3 dạng nút "i" gọi hàm **khác** `toggleHint` toàn cục — cần phân biệt rõ
trước khi quyết định sửa hay không:

1. **Hint gắn với bài đọc split-screen** — nút "i" gọi hàm khác tên, ví dụ
   `showReadingHint(event, targets, hintBoxId, track)`. Hàm này vừa hiện
   hint-box vừa highlight + cuộn tới đoạn text tương ứng trong panel đọc
   bên trái. Đổi vị trí hint ở đây có thể phá liên kết trực quan với bài
   đọc, nên **mặc định giữ nguyên**, không đổi sang `toggleHint`/`inline-hint`.
   → Nhận diện bằng cách grep `onclick="showReadingHint(` trong file.

   ⚠️ **Điều kiện cho việc "giữ nguyên":** chỉ đúng khi `.hint-box` đó đang
   nằm trong luồng bình thường (không có `position: absolute/fixed` nào áp
   lên nó) — khi đó nó không thể tràn ra ngoài đè lên phần tử khác, tối đa
   chỉ đẩy nội dung bên dưới xuống. Nếu `.hint-box` đó **lại có** class
   `absolute` (hoặc bất kỳ CSS nào đưa nó ra khỏi luồng), nguy cơ tràn/che
   là có thật (đã gặp thực tế ở `solution-preinterm-6a.html` Ex4, 2026-09-06
   — hint đè lên nút "Show All"/"Reset" bên dưới). Trường hợp này: **giữ
   nguyên 100% phần gọi highlight + cuộn** trong `showReadingHint`, nhưng
   **thêm** lệnh gọi `positionHintBox(h, btn)` ngay sau dòng
   `h.style.display = 'block'` (chỉ khi `h.classList.contains('inline-hint')`),
   và đổi `class="hint-box absolute"` → `class="hint-box inline-hint"` như
   các hint `toggleHint` khác. Định vị và highlight/cuộn là 2 việc độc lập,
   thêm định vị không phá logic highlight.
2. **Hint có cơ chế toggle riêng thực sự cần thiết** — ví dụ
   `toggleEx3Hint(col)` dùng `classList.toggle('show')`, đã tự anchor đúng
   theo ngữ cảnh riêng (bảng nhiều cột, vị trí cố định...). Nếu đã hoạt
   động đúng và không có lý do đặc thù để tồn tại riêng, **vẫn nên cân nhắc
   gộp về chuẩn `toggleHint`+`inline-hint`** — chỉ giữ riêng khi hàm đó có
   logic không thể thay thế (vd tự tính toán vị trí theo bảng, theo cột).
3. **Hàm cục bộ đặt tên gần giống nhưng KHÔNG phải `toggleHint`** (đã gặp
   thực tế: `toggleEx1Hint` trong `solution-interm-2f.html` Bài 1) — đây là
   dạng dễ bỏ sót nhất. Vì tên hàm khác `toggleHint`, `access-core.js`
   **không ghi đè** được (không giống các hàm `toggleHint` cục bộ ở các
   file khác vốn luôn bị ghi đè) — hàm này chạy thật 100% theo đúng code
   viết trong file, nhưng thường dùng `.hint-box` không có `position` gì cả
   (chỉ trôi nổi trong flex/flow bình thường), không nhất quán với chuẩn
   `inline-hint` toàn dự án. → **Mặc định chuyển hẳn sang dùng
   `toggleHint(event, id)` toàn cục + class `inline-hint`**, xóa hàm cục bộ
   đó đi, trừ khi nó có logic đặc thù không thể thay thế (như dạng 1).
   → Nhận diện bằng cách grep mọi `onclick="toggle...Hint(` hoặc tên hàm
   lạ gắn trên nút `class="hint-btn"`, rồi đối chiếu: có phải đúng tên
   `toggleHint` không, có phải `showReadingHint` không — nếu không phải cả
   2, đây là dạng 2 hoặc 3, cần xem xét kỹ.

Với **mọi trường hợp còn lại** (nút "i" gọi đúng `toggleHint(event, id)`),
bắt buộc thêm `inline-hint`, bất kể file đó đã có wrapper riêng, đã có class
`absolute` riêng, hay hoàn toàn không có gì.

### Cách chuyển 1 hàm cục bộ riêng (dạng 3) sang dùng `toggleHint` toàn cục

```js
// TRƯỚC — hàm cục bộ riêng, tên khác toggleHint, không bị access-core.js ghi đè
function toggleExNHint(hintId) {
    const hintBox = document.getElementById(hintId);
    if (!hintBox) return;
    const isVisible = hintBox.style.display === 'block';
    document.querySelectorAll('.hint-box').forEach(el => el.style.display = 'none');
    if (!isVisible) hintBox.style.display = 'block';
}
// ...
hintBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleExNHint(hintBoxId);  // hintBoxId tự đặt tên tuỳ ý, vd `exN-hint-${idx}`
});
// ...
hintBox.className = 'hint-box';
hintBox.id = hintBoxId;
```

```js
// SAU — dùng chung toggleHint() toàn cục (từ access-core.js) + inline-hint
// (xoá hẳn hàm toggleExNHint cục bộ)
const qid = `exN-q${idx}`;   // id gốc, KHÔNG kèm hậu tố "-hint"
hintBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleHint(e, qid);      // toggleHint() tự tìm `#${qid}-hint`
});
// ...
hintBox.className = 'hint-box inline-hint';
hintBox.id = `${qid}-hint`;  // BẮT BUỘC đúng hậu tố "-hint" để toggleHint() tìm thấy
```

Lưu ý bắt buộc: `toggleHint(event, id)` của `access-core.js` luôn tự nối
thêm hậu tố `-hint` khi tìm phần tử (`getElementById(id + '-hint')`) — vì
vậy `id` truyền vào phải là id gốc (không kèm `-hint`), còn `hintBox.id`
thực tế phải là `${id}-hint`. Nếu file cũ đặt tên id kiểu khác (vd
`ex1-hint-${idx}` thay vì `ex1-q${idx}-hint`), phải đổi lại theo đúng
convention này khi chuyển đổi, không giữ nguyên tên cũ.

---

## 2. Cách sửa (áp dụng cho MỌI file, không cần phân biệt cấu trúc cũ)

### Bước 1 — Thêm CSS vào cuối `<style>` (ngay trước `</style>`)

```css
/* Hint popup - chuẩn hóa vị trí nổi cạnh nút i, tương thích access-core.js
   (access-core.js override toggleHint: nếu .hint-box có class inline-hint,
   nó sẽ tự dùng position:fixed + getBoundingClientRect để luôn hiện đúng
   cạnh nút bấm, không bị cắt/tràn ở bất kỳ mép nào của màn hình) */
.hint-box.inline-hint {
    position: fixed;
    top: auto;
    left: auto;
    margin-top: 0;
    max-width: 380px;
    width: max-content;
    white-space: normal;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    z-index: 9999;
}
```

`white-space: normal` và `width: max-content` là **bắt buộc**, không phải tùy
chọn — xem Bước 3b bên dưới để biết lý do (bẫy kế thừa `white-space: nowrap`
từ phần tử cha).

Phải chèn **ở cuối** khối `<style>` (ngay trước `</style>`), không chèn ở
đầu — lý do xem Bước 3 (specificity).

### Bước 2 — Thêm class `inline-hint` vào mọi `<div class="hint-box" ...>` mà nút "i" cạnh nó gọi `toggleHint()`

```html
<!-- Trước -->
<div class="hint-box" id="${qid}-hint">${hint_html}</div>
<div class="hint-box absolute" id="${qid}-hint">${hint_html}</div>

<!-- Sau (bỏ hẳn class absolute cũ nếu có, thay bằng inline-hint) -->
<div class="hint-box inline-hint" id="${qid}-hint">${hint_html}</div>
```

Áp dụng y hệt dù `.hint-box` đó:
- nằm trơn trong `.question-row` (không có wrapper gì),
- nằm trong `.inline-group` (position:relative có sẵn),
- nằm trong wrapper tự đặt tên riêng như `.hint-anchor`/`.ex1-hint-anchor`
  (position:relative có sẵn),
- nằm trong context lồng nhiều cấp như `.label-input-row .row-btns .hint-box`.

**Không cần** bọc thêm `<span class="hint-anchor">` mới — vì `inline-hint`
dùng `position:fixed` tính theo `getBoundingClientRect()` của nút bấm, hoàn
toàn không phụ thuộc DOM cha. Giữ nguyên wrapper cũ nếu file đã có sẵn (vô
hại), chỉ cần thêm class `inline-hint` lên chính thẻ `.hint-box`.

### Bước 3 — ⚠️ Bẫy specificity CSS khi file có selector lồng ngữ cảnh cha

Nếu CSS gốc định vị `.hint-box` bằng selector **nhiều hơn 2 class/phần tử**
nối nhau qua khoảng trắng (descendant selector), ví dụ:

```css
.label-input-row .row-btns .hint-box {
    position: absolute;
    top: 100%;
    left: 0;
    ...
}
```

thì specificity của rule này (3 class = 0,3,0) **cao hơn** specificity của
`.hint-box.inline-hint` (2 class = 0,2,0) — nghĩa là dù đặt CSS `inline-hint`
ở cuối file, rule cũ vẫn thắng, class `inline-hint` không có tác dụng.

**Cách sửa:** viết thêm 1 rule override khớp đúng ngữ cảnh cha cũ + thêm
`.inline-hint`, để specificity mới cao hơn:

```css
/* Ghi đè riêng cho selector lồng ngữ cảnh cha cụ thể — đặt SAU rule gốc */
.label-input-row .row-btns .hint-box.inline-hint {
    position: fixed;
    top: auto;
    left: auto;
    margin-top: 0;
    z-index: 9999;
}
```

Quy tắc chung: **trước khi thêm class `inline-hint`, luôn grep xem `.hint-box`
có đang bị định vị bởi 1 selector lồng ngữ cảnh cha nào không** (không chỉ
`.hint-box { ... }` hay `.hint-box.absolute { ... }` mà cả dạng
`.parent-class .child-class .hint-box { ... }`). Nếu có, phải viết thêm 1
rule override đúng-ngữ-cảnh-đó + `.inline-hint` như trên, đặt **sau** rule
gốc trong file. Nếu specificity bằng nhau (2 class = 2 class), chỉ cần đặt
rule mới sau rule cũ trong `<style>` là đủ (không cần thêm ngữ cảnh cha).

### Bước 3b — ⚠️ Bẫy kế thừa `white-space: nowrap` từ phần tử cha (chữ tràn ra ngoài khung hint)

Phát hiện thực tế trong `solution-preinterm-6a.html` (2026-09-06): sau khi
đổi `class="hint-box absolute"` → `class="hint-box inline-hint"`, phần chữ
giải thích trong hint tràn hẳn ra ngoài viền khung thay vì tự xuống dòng.

**Nguyên nhân:** `.hint-box` thường nằm lồng bên trong 1 wrapper dùng
`white-space: nowrap` để giữ cả hàng input/eye-btn/hint-btn không bị xuống
dòng — ví dụ `.inline-input-group { white-space: nowrap; }`,
`.label-input-row { white-space: nowrap; }`. `white-space` là thuộc tính
**kế thừa (inherited)** trong CSS — dù `.hint-box` đã đổi sang
`position: fixed` (tách hẳn khỏi luồng layout của cha), nó **vẫn kế thừa**
`white-space: nowrap` từ tổ tiên, vì kế thừa CSS đi theo cây DOM chứ không
phụ thuộc `position`. Kết quả: chữ trong hint không bao giờ tự xuống dòng,
cứ tràn dài ra ngoài `max-width` đã đặt.

Class `.hint-box.absolute` đời cũ (trước khi có `inline-hint`) từng có sẵn
dòng `white-space: normal;` để chặn đúng lỗi này — nhưng khi chuyển sang
`inline-hint`, dễ quên mang dòng đó theo nếu chỉ copy máy móc phần
`position/top/left/z-index`.

**Cách phòng tránh:** CSS `.hint-box.inline-hint` chuẩn (xem Bước 1) đã có
sẵn `white-space: normal;` và `width: max-content;` — **luôn dùng đúng
block CSS đầy đủ đó**, không tự rút gọn. Nếu nghi ngờ, grep `white-space`
toàn file trước khi sửa: nếu có bất kỳ ancestor nào của `.hint-box` (dò theo
cấu trúc HTML nơi hint được render, không chỉ chính `.hint-box`) đặt
`white-space: nowrap`, càng phải chắc chắn `.hint-box.inline-hint` reset lại
`white-space: normal` tường minh.

### Bước 4 — Việc KHÔNG cần làm

- Không sửa hàm `toggleHint` cục bộ trong `<script>` — vô tác dụng.
- Không cần bọc `<span class="hint-anchor">` mới quanh `row-btns` + `hint-box`.
- Không cần thêm `position: relative` vào `.question-row`.
- Không xóa các class/wrapper cũ đã có (`.inline-group`, `.hint-anchor`,
  `.absolute`...) — để nguyên, không ảnh hưởng gì, chỉ là dead code vô hại
  một khi `inline-hint` đã thắng.

---

## 3. Checklist áp dụng cho 1 file mới

- [ ] Grep toàn file: `.hint-box` xuất hiện ở những đâu (kể cả tên class
      biến thể như `.hint-box absolute`, `.hint-box` không class phụ nào).
- [ ] Với mỗi vị trí, xác định nút "i" cạnh nó gọi hàm gì:
  - `toggleHint(event, id)` → PHẢI thêm `inline-hint`.
  - `showReadingHint(...)` → giữ nguyên, không đụng.
  - Hàm tên khác có cơ chế `classList.toggle`/tự viết riêng → kiểm tra xem
    đã anchor đúng chưa; nếu đúng thì giữ nguyên, nếu bug thì sửa CSS riêng
    của chính hàm đó (không áp `inline-hint` vì `access-core.js` không can
    thiệp vào các hàm này).
- [ ] Với mỗi vị trí cần sửa: thêm class `inline-hint` vào thẻ `.hint-box`
      (bỏ class `absolute` cũ nếu có).
- [ ] Kiểm tra CSS định vị `.hint-box` gốc có phải selector lồng ≥3 phần tử
      không — nếu có, viết thêm rule override đúng ngữ cảnh (xem Bước 3).
- [ ] Grep `white-space` toàn file — nếu có ancestor nào của `.hint-box` đặt
      `white-space: nowrap`, đảm bảo `.hint-box.inline-hint` có sẵn
      `white-space: normal; width: max-content;` (xem Bước 3b).
- [ ] Thêm 1 block CSS `.hint-box.inline-hint {...}` (xem Bước 1) ở cuối
      `<style>`, chỉ 1 lần mỗi file.
- [ ] Kiểm tra thứ tự `<script src="access-core.js">` so với `<script>` cục
      bộ (xem mục 0b) — nếu KHÔNG chắc chắn access-core.js nạp sau cùng,
      thêm `window.addEventListener('load', () => { window.toggleHint = toggleHint; });`
      làm lưới an toàn (xem mục 0c) thay vì tự đảo thứ tự thẻ `<script>`.
- [ ] Verify: tách từng `<script>` ra file `.js` riêng, chạy `node --check`
      để đảm bảo không lỗi cú pháp do thao tác hàng loạt.
- [ ] Diff lại với file gốc để xác nhận chỉ đổi đúng những dòng dự kiến.

---

## 4. Nội dung hint chuẩn (tham khảo cấu trúc, không bắt buộc đổi nếu file đã đúng nội dung)

```html
<div class="hint-detail">
  <strong>Đáp án:</strong> <span class="key-word">bought</span>
</div>
<div class="hint-detail">
  <strong>Giải thích:</strong> "Just after they got married" xác định thời gian cụ thể
  → hai hành động liên tiếp nhau. Dùng <strong>past simple</strong>.
</div>
```

---

## 0b. ⭐ Mẫu tham khảo chuẩn (reference implementation) — dùng làm mẫu cho mọi file sau này

`solution-preinterm-review_5.html` (2026-09-03) là file có cách triển khai hint popup
**hoàn chỉnh và đáng tin cậy nhất** trong dự án tính đến nay — dùng làm **mẫu khi viết
mới hoặc chuẩn hóa hint cho bất kỳ file nào**, không chỉ giới hạn ở trường hợp script
order bị đảo ngược. Ưu điểm so với việc chỉ thêm class `inline-hint` rồi phó mặc cho
`access-core.js`: logic định vị nằm ngay trong file, dễ đọc/debug, tự xử lý cả tràn
trên/dưới/trái/phải, và tự cập nhật lại vị trí khi cuộn/resize trang.

```js
let currentHintBtn = null;

function positionHintBox(hintBox, btn) {
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const boxRect = hintBox.getBoundingClientRect();

    // Căn giữa hộp hint theo TÂM của chính nút vừa bấm (event.currentTarget
    // — nút "i" thật sự được click), không căn theo cạnh trái hay theo một
    // nút khác — lệch tâm ở đây là nguyên nhân phổ biến khiến mũi tên (thêm
    // ở dưới) trỏ sai vị trí dù box đã hiện đúng chỗ.
    let left = rect.left + rect.width / 2 - boxRect.width / 2;
    if (left < 8) left = 8;
    if (left + boxRect.width > window.innerWidth - 8) left = window.innerWidth - boxRect.width - 8;

    // Mặc định hiện PHÍA DƯỚI nút; chỉ lật lên TRÊN khi phía dưới không đủ
    // chỗ VÀ phía trên còn rộng hơn phía dưới.
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    let top, below;
    if (spaceBelow < boxRect.height + 12 && spaceAbove > spaceBelow) {
        top = rect.top - boxRect.height - 12;
        below = false;
    } else {
        top = rect.bottom + 12;
        below = true;
    }
    if (top < 8) top = 8;

    hintBox.style.top = top + 'px';
    hintBox.style.left = left + 'px';

    // ⚠️ Xác định lại hướng mũi tên DỰA THEO vị trí thực tế SAU KHI đã kẹp
    // `top` về 8px — không dùng lại cờ `below` tính trước khi kẹp. Nếu bỏ
    // qua bước này: khi box bị ép sát mép trên màn hình (thường xảy ra với
    // hint ở gần đầu trang, hoặc hint quá cao), box thực chất đang nằm PHÍA
    // TRÊN nút "i" nhưng mũi tên vẫn vẽ theo cờ `below` cũ (trỏ nhầm hướng).
    // Đây từng là bug thật trong bản đầu tiên của guide này — xem mục 4d cũ.
    below = (top + boxRect.height / 2) > rect.top;

    const arrowX = Math.max(14, Math.min(boxRect.width - 14, (rect.left + rect.width / 2) - left));
    hintBox.style.setProperty('--arrow-x', arrowX + 'px');
    hintBox.classList.toggle('arrow-up', below);
    hintBox.classList.toggle('arrow-down', !below);
}

// Nút neo đã cuộn khuất hẳn khỏi viewport → tự đóng hint thay vì kẹp mép
// (tránh hint dính đè lên nội dung không liên quan — xem mục 4c).
function isBtnOffScreen(btn) {
    if (!btn || !btn.isConnected) return true;
    const r = btn.getBoundingClientRect();
    return r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth;
}

function repositionCurrentHint() {
    if (!currentHintBtn) return;
    if (isBtnOffScreen(currentHintBtn)) { closeAllHints(); return; }
    const open = document.querySelector('.hint-box[style*="display: block"]');
    if (open) positionHintBox(open, currentHintBtn);
}

function closeAllHints() {
    document.querySelectorAll('.hint-box').forEach(h => h.style.display = 'none');
    currentHintBtn = null;
}

function toggleHint(event, id) {
    if (event) event.stopPropagation();
    const h = document.getElementById(id);
    if (!h) return;
    const isVisible = h.style.display === 'block';
    closeAllHints();
    if (isVisible) return;
    h.style.display = 'block';
    const btn = event ? (event.currentTarget || event.target) : null;
    currentHintBtn = btn;
    positionHintBox(h, btn);
}

window.addEventListener('scroll', repositionCurrentHint, true);
window.addEventListener('resize', repositionCurrentHint);
```

Bản này đã gộp sẵn 3 mảnh từng tách rời ở các mục 4c/4d cũ (mũi tên +
tự đóng khi nút neo cuộn khuất) ngay từ đầu — không còn phải "cấy thêm sau"
như quy trình cũ. Nếu chỉ cần bản KHÔNG có mũi tên (hiếm khi cần), bỏ 3 dòng
tính `arrowX`/`classList.toggle` ở cuối `positionHintBox`, còn lại giữ
nguyên.

⚠️ **Lưu ý về quy ước id**: bản mẫu ở trên (`document.getElementById(id)`) giả định
`id` truyền vào **đã là id đầy đủ của box** (không tự nối thêm hậu tố). Nhưng đa số
file trong dự án dùng quy ước ngược lại — nút "i" gọi `toggleHint(event, qid)` với
`qid` là id gốc KHÔNG kèm `-hint`, còn box thật có id `${qid}-hint` (khớp hành vi
`access-core.js` mô tả ở mục 0). **Luôn kiểm tra quy ước đang dùng trong chính file
đó** (xem HTML box đang render ra id gì, và call site đang truyền gì) trước khi cấy
mẫu — nếu file dùng quy ước hậu tố, đổi dòng `getElementById(id)` thành
`getElementById(id + '-hint')` để khớp với mọi call site cũ, **không đổi ngược lại
tất cả call site** để khớp mẫu (đổi call site tốn công và dễ sót). Đã áp dụng theo
đúng cách này (giữ quy ước hậu tố có sẵn của từng file) ở
`solution-preinterm-1f.html`, `solution-preinterm-6a.html`,
`solution-preinterm-1b.html` (2026-09-06).

CSS đi kèm (đã gồm sẵn mũi tên — không cần thêm rule riêng ở bước sau):

```css
.hint-box.inline-hint {
    position: fixed;
    top: auto;
    left: auto;
    margin-top: 0;
    max-width: 380px;
    width: max-content;
    white-space: normal;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    z-index: 9999;
}

.hint-box.inline-hint::after {
    content: "";
    display: block;
    position: absolute;
    left: var(--arrow-x, 20px);
    width: 0;
    height: 0;
    transform: translateX(-50%);
    border: 8px solid transparent;
    pointer-events: none;
}

/* Box nằm DƯỚI nút (mặc định) → mũi tên ở mép trên, trỏ LÊN */
.hint-box.inline-hint.arrow-up::after {
    bottom: 100%;
    border-bottom-color: var(--hint-border);
}

/* Box bị lật lên TRÊN nút (tràn đáy màn hình) → mũi tên ở mép dưới, trỏ XUỐNG */
.hint-box.inline-hint.arrow-down::after {
    top: 100%;
    border-top-color: var(--hint-border);
}
```

⚠️ **Lịch sử sửa màu mũi tên (đọc để không lặp lại 2 lần sai đã gặp thực tế,
2026-09-07 → 2026-09-08):**

1. Bản đầu tiên dùng `border-color: transparent transparent var(--hint-bg)
   transparent` (shorthand 4 giá trị, dựa vào `--hint-bg` kế thừa qua DOM).
   Kết quả: mũi tên **hoàn toàn không hiện** ở nhiều file. Nghi vấn: thiếu
   `width:0;height:0` tường minh trên `::after`, và/hoặc `--hint-bg` không
   resolve được đúng ngữ cảnh khi `.hint-box.inline-hint` đã tách khỏi luồng
   bằng `position:fixed` (kế thừa CSS vẫn đi theo cây DOM nhưng có thể bị 1
   rule global khác ghi đè) — khi 1 giá trị trong shorthand `border-color`
   invalid, cả khai báo bị bỏ qua, mất luôn cả 4 cạnh.
2. Bản vá tiếp theo: thêm tường minh `width:0;height:0;display:block;
   pointer-events:none` trên `::after`, tách `border-color` shorthand thành
   `border-bottom-color`/`border-top-color` riêng lẻ (an toàn hơn, 1 giá trị
   sai không làm hỏng cả khai báo), và **không dựa vào `--hint-bg` kế thừa
   nữa** — gán `--hint-arrow-color` bằng JS
   (`hintBox.style.setProperty('--hint-arrow-color',
   getComputedStyle(hintBox).backgroundColor)`) ngay trong `positionHintBox`,
   đọc đúng màu nền THẬT của box tại thời điểm hiện. Mũi tên **hiện được**,
   nhưng màu **nhạt/mờ, khó thấy** — vì `--hint-bg` (nền hint) vốn là màu
   NHẠT theo thiết kế (để chữ dễ đọc), không phải màu để làm điểm nhấn.
3. **Chuẩn đúng cuối cùng (xác nhận qua so sánh ảnh chụp thực tế 2 file,
   2026-09-08):** dùng `var(--hint-border)` — biến màu viền đậm mà chính
   `.hint-box` đã dùng sẵn cho `border-left: 5px solid var(--hint-border)`
   — thay vì `--hint-bg`. `--hint-border` là màu ACCENT đậm hơn hẳn, mũi tên
   mới nổi rõ thay vì hòa vào nền hộp. Vì `--hint-border` là biến theme ổn
   định (không đổi theo từng instance như màu nền có thể), **không cần** khai
   báo `--hint-arrow-color` hay gán bằng JS nữa — dùng thẳng `var(--hint-border)`
   trong CSS, kế thừa tự nhiên từ `access-theme.css` là đủ.

**Bài học:** khi cần 1 màu "nổi bật/điểm nhấn" cho UI (mũi tên, icon, viền
nhấn...), luôn ưu tiên biến màu ACCENT/BORDER đã có sẵn trong theme
(`--hint-border`, hoặc tương đương), đừng dùng biến màu NỀN (`--hint-bg`) dù
nghe có vẻ "khớp màu" hơn — nền luôn nhạt hơn viền theo chủ đích thiết kế.

Vẫn thêm class `inline-hint` vào mọi `.hint-box` khi render (đồng bộ quy ước, dễ nhận
diện khi audit lại sau này).

### Khi nào dùng mẫu này thay vì dựa vào `toggleHint` của `access-core.js`

- **Bắt buộc dùng mẫu này** nếu phát hiện script order bị đảo ngược (xem cách kiểm tra
  ở mục 0: `<script src="access-core.js">` nằm TRƯỚC khối `<script>` cục bộ thay vì
  sau) — khi đó hàm `toggleHint` cục bộ mới là hàm thật, chỉ thêm class `inline-hint`
  sẽ vô tác dụng nếu không tự cấy logic định vị này vào.
- **Khuyến khích dùng mẫu này** kể cả khi script order đúng chuẩn (access-core.js ở
  cuối) — vì mẫu này đáng tin cậy hơn, dễ đọc/debug ngay trong file, và không phụ
  thuộc vào việc `access-core.js` (file dùng chung, sửa 1 nơi ảnh hưởng mọi file)
  có được cập nhật đúng như mong đợi hay không.
- **Cập nhật 2026-09-07 — `access-core.js` đã hết mù mũi tên (2 lỗi, cả 2 đã vá):**
  1. `positionInlineHint()` (hàm định vị thật bên trong `window.toggleHint` toàn cục
     của `access-core.js`) trước đây chỉ toggle class `hint-below`, KHÔNG hề set
     `arrow-up`/`arrow-down` — nên file nào chỉ dựa hoàn toàn vào `access-core.js`
     (không cấy mẫu này) mà CSS lại định nghĩa mũi tên theo 2 class đó thì mũi tên
     luôn sai hướng. **Đã vá**: hàm này giờ toggle cả `hint-below` (tương thích
     ngược) lẫn `arrow-up`/`arrow-down` đúng ngữ nghĩa.
  2. Cùng lỗi "cờ `below` lỗi thời sau khi kẹp mép" như mô tả ở mục 4d cũng tồn tại
     y hệt trong `positionInlineHint()` (`below` chỉ được set trong nhánh
     "không đủ chỗ phía trên", không hề tính lại sau 2 dòng kẹp cuối cùng). **Đã vá
     cùng lúc**: thêm dòng tính lại `below = (top + h.offsetHeight / 2) > rect.top`
     ngay trước khi set class, đúng như cách mục 4d/0b áp dụng.

  Vì vậy file chỉ dùng `toggleHint()` toàn cục + class `inline-hint` (không cấy
  mẫu 0b) **giờ cũng lên đúng mũi tên ở mọi trường hợp**, kể cả trường hợp hiếm khi
  box bị ép sát mép trên màn hình — miễn CSS của file đó dùng đúng tên class
  `arrow-up`/`arrow-down` như ở mục 4d. Vẫn khuyến khích cấy hẳn mẫu 0b cho file mới
  hoặc khi chuẩn hóa lại 1 file (dễ đọc/debug ngay trong file, không phụ thuộc 1
  file dùng chung), nhưng lý do "access-core.js còn bug" không còn là lý do bắt
  buộc nữa.

---

## 0c. Lưới an toàn cho thứ tự script — `window.addEventListener('load', ...)`

Khi đã cấy mẫu tham khảo (mục 0b) vào 1 file, mục tiêu là đảm bảo **hàm `toggleHint`
cục bộ luôn thắng**, bất kể `<script src="access-core.js">` nằm trước hay sau khối
`<script>` cục bộ trong file đó — thay vì phải tự dò/đảo thứ tự thẻ `<script>` (dễ
nhầm, và đảo thứ tự có thể ảnh hưởng tính năng khác mà `access-core.js` cung cấp).

**Cách làm:** thêm dòng này ngay sau khi định nghĩa hàm `toggleHint` (hoặc cuối
`window.onload` sẵn có trong file):

```js
window.addEventListener('load', () => { window.toggleHint = toggleHint; });
```

**Vì sao dùng được:** sự kiện `load` của `window` chỉ bắn ra **sau khi mọi
`<script>` trong trang (kể cả `<script src="access-core.js">`) đã parse và chạy
xong**, bất kể thứ tự khai báo thẻ `<script>` trong HTML. Vì vậy phép gán
`window.toggleHint = toggleHint` trong callback `load` luôn là **hành động ghi đè
cuối cùng**, đảm bảo bản cục bộ (đầy đủ logic `positionHintBox`) thắng tuyệt đối,
không cần quan tâm `access-core.js` được nạp trước hay sau, không cần đảo thẻ
`<script>`.

Nếu file đã có sẵn `window.onload = () => { ... }` (thường dùng để gọi các hàm
`renderExN()` khi trang tải xong), chỉ cần thêm 1 dòng
`window.toggleHint = toggleHint;` vào **bên trong** khối đó thay vì tạo thêm 1
listener `load` riêng — 2 cách tương đương, chọn cách nào gọn hơn với file đang sửa
(không gán `window.onload` 2 lần đè nhau — nếu file dùng `window.onload = ...`, phải
sửa vào trong khối đó; nếu file không có sẵn, dùng
`window.addEventListener('load', ...)` để không đụng vào `onload` có thể đã được set
chỗ khác).

Đã áp dụng cách này ở `solution-preinterm-1f.html` và `solution-preinterm-1b.html`
(2026-09-06) — cả 2 file này script order vốn "đúng chuẩn" (access-core.js ở cuối)
nên về lý thuyết không bắt buộc, nhưng thêm vào để chắc chắn 100%, không phụ thuộc
suy đoán về hành vi thật của `access-core.js`.

---

## 4c. Bẫy — hint dính màn hình khi nút neo đã cuộn khuất hẳn khỏi viewport

> Đã tích hợp sẵn vào mẫu chuẩn ở mục 0b/5 (hàm `isBtnOffScreen` + gọi trong
> `repositionCurrentHint`) — mục này giờ chỉ còn giá trị lịch sử + retrofit cho
> file cũ đã triển khai `repositionCurrentHint` đời đầu (chưa có kiểm tra này).

Phát hiện thực tế ở `solution-preinterm-6a.html`, `solution-preinterm-6b.html`,
`solution-preinterm-6d.html` (2026-09-07). Cả 3 file dùng đúng **reference
implementation** ở mục 5 (`positionHintBox` + `repositionCurrentHint` +
`closeAllHints` + `toggleHint`), nhưng bản gốc vẫn có 1 lỗi ẩn:

`repositionCurrentHint` gọi `positionHintBox` **mù quáng** mỗi lần bắn sự kiện
`scroll`, không hề kiểm tra xem nút neo (`currentHintBtn`) đã cuộn ra khỏi
viewport chưa. Trong khi đó `positionHintBox` chỉ có logic **kẹp (clamp)** vào
mép trên/dưới/trái/phải (`if (top < margin) top = margin`, tương tự cho
`left`), không có điều kiện tự đóng. Hệ quả: khi người dùng cuộn nhanh khiến
nút "i" trôi hẳn lên trên (hoặc xuống dưới) màn hình, hint không biến mất mà bị
kẹp dính cứng ở mép màn hình, đè lên nội dung khác hoàn toàn không liên quan
phía dưới/trên (đã gặp thực tế: hint dính ở mép trên, đè lên phần đầu trang).

**Cách sửa — thêm đúng 1 hàm + 1 dòng gọi, không đụng gì khác:**

```javascript
function isBtnOffScreen(btn) {
    if (!btn || !btn.isConnected) return true;
    const r = btn.getBoundingClientRect();
    return r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth;
}

function repositionCurrentHint() {
    if (!currentHintBtn) return;
    if (isBtnOffScreen(currentHintBtn)) { closeAllHints(); return; }   // THÊM dòng này
    const open = document.querySelector('.hint-box[style*="display: block"]');
    if (open) positionHintBox(open, currentHintBtn);
}
```

Lưu ý:
- Ngưỡng dùng là "cuộn ra ngoài **hẳn**" (top/bottom/left/right lệch khỏi cả
  viewport), không phải "bị che khuất một phần" — nút chỉ khuất một phần (vẫn
  còn giao với viewport) thì vẫn giữ hint mở và reposition bình thường, không
  đóng non.
- `positionHintBox` **không cần sửa gì** — hàm này đã lấy kích thước hint thực
  qua `hintBox.getBoundingClientRect()` (không hardcode width cứng như
  260px), và đã có sẵn logic tự lật xuống dưới nếu không đủ chỗ phía trên
  trước khi mới kẹp margin làm phương án cuối. Bug chỉ nằm ở chỗ
  `repositionCurrentHint` gọi nó vô điều kiện lúc scroll, không nằm ở bản thân
  `positionHintBox`.
- Vì đây là bug trong chính reference implementation ở mục 5, **mọi file khác
  đã/sẽ áp dụng mẫu này đều cần rà lại và thêm `isBtnOffScreen` tương tự** —
  không chỉ riêng 6a/6b/6d.

---

## 4d. Mũi tên (arrow) chỉ vào nút "i" — nay đã có sẵn trong mẫu chuẩn, mục này chỉ dùng để RETROFIT file cũ

> **Cập nhật 2026-09-07:** mũi tên **không còn là bước "bổ sung thêm sau" nữa** —
> bản `positionHintBox` chuẩn ở mục 0b/5 giờ đã tích hợp sẵn mũi tên (và cả bẫy
> "hint dính màn hình" ở mục 4c) ngay từ đầu. **File mới hoặc file đang chuẩn hóa
> lại từ đầu: dùng thẳng mẫu ở mục 0b/5, bỏ qua mục 4d này.** Mục 4d chỉ còn giá
> trị cho 1 tình huống: **file cũ đã lỡ triển khai bản `positionHintBox` ĐỜI ĐẦU
> (không có mũi tên) trước ngày 2026-09-07** — cần vá thêm mà không muốn thay
> nguyên cả hàm bằng bản mới nhất.

Hint chỉ là 1 khung nổi trơn, không có gì chỉ trực quan vào đúng nút "i" nào đã
mở nó — khi 2 nút "i" gần nhau, hoặc hint bị kẹp lệch sang trái/phải do gần mép
màn hình, người dùng dễ nhầm hint đang thuộc về câu nào. Cách vá dưới đây **chỉ
sửa đúng 1 hàm `positionHintBox`** — không đụng `toggleHint`, `closeAllHints`,
`repositionCurrentHint` hay bất kỳ HTML/render function nào.

### Vì sao không thể dùng 1 mũi tên CSS cố định như bản đơn giản ban đầu

Bản đầu tiên (chỉ dùng `.inline-hint::after` với `top: 100%; left: 50%` cố
định — xem ví dụ đã sửa ở `solution-preinterm-3d.html`) có 2 lỗi khi ghép
vào `positionHintBox`:

1. **Không lật theo hướng thực tế của box.** `positionHintBox` tự chọn hiện
   box phía dưới nút (mặc định) hoặc phía trên (khi tràn đáy màn hình) — mũi
   tên cố định 1 hướng sẽ sai bất cứ khi nào box rơi vào nhánh còn lại.
2. **Không lệch theo tâm nút khi box bị kẹp mép trái/phải.** `positionHintBox`
   kẹp `left` của box vào trong viewport (`if (left + boxRect.width >
   window.innerWidth - 8) left = ...`), nghĩa là tâm box không còn trùng tâm
   nút bấm nữa khi câu hỏi nằm sát mép màn hình — mũi tên đặt cứng `left: 50%`
   sẽ trỏ lệch khỏi nút.

Vì vậy mũi tên phải được tính **động theo từng lần gọi `positionHintBox`**,
dựa trên: (a) box thực sự đang ở trên hay dưới nút, và (b) tâm nút bấm nằm ở
đâu so với mép trái của box sau khi đã kẹp.

### ⚠️ Lỗi thứ 3 (phát hiện muộn hơn, 2026-09-07) — cờ `below` bị lỗi thời sau khi kẹp mép trên

Bản retrofit đầu tiên của mục này (tính `below` một lần dựa trên nhánh
if/else rồi dùng luôn cho tới cuối hàm) còn sót 1 trường hợp: khi box quá cao
hoặc nút "i" nằm quá gần đầu trang, nhánh "lật lên trên" tính ra `top` âm,
rồi bị dòng kẹp cuối cùng (`if (top < 8) top = 8;`) đẩy ngược xuống — box lúc
này **thực chất lại nằm dưới nút** (hoặc chồng lên nút), nhưng cờ `below`
vẫn giữ giá trị `false` từ trước, khiến mũi tên vẽ sai hướng dù box đã hiện
đúng chỗ có thể nhìn thấy trên màn hình. `access-core.js` (bản dùng chung
toàn dự án) từng giữ y hệt lỗi này, **đã được vá cùng lúc với phần class ở
mục 0** (2026-09-07) — không còn tồn tại trong bản `access-core.js` hiện
tại. **Cách sửa:** không dùng lại cờ `below` tính trước khi kẹp —
tính lại `below` một lần cuối, ngay trước khi set class, dựa trên vị trí
`top` **sau khi đã kẹp xong**: `below = (top + boxRect.height / 2) > rect.top;`
(tâm box nằm dưới cạnh trên của nút → coi là "box ở dưới nút" → mũi tên trỏ
lên). Bản ở mục 0b/5 đã áp dụng đúng cách tính lại này.

### Bước 1 — CSS: thêm vào cuối khối `.hint-box.inline-hint { ... }` (mục 1/5)

```css
.hint-box.inline-hint::after {
    content: "";
    display: block;
    position: absolute;
    left: var(--arrow-x, 20px);
    width: 0;
    height: 0;
    transform: translateX(-50%);
    border: 8px solid transparent;
    pointer-events: none;
}

/* Box đang nằm DƯỚI nút (mặc định của positionHintBox) → mũi tên ở mép trên, trỏ LÊN */
.hint-box.inline-hint.arrow-up::after {
    bottom: 100%;
    border-bottom-color: var(--hint-border);
}

/* Box bị lật lên TRÊN nút (do tràn đáy màn hình) → mũi tên ở mép dưới, trỏ XUỐNG */
.hint-box.inline-hint.arrow-down::after {
    top: 100%;
    border-top-color: var(--hint-border);
}
```

Dùng thẳng `var(--hint-border)` — biến màu viền đậm mà chính `.hint-box` đã
dùng sẵn cho `border-left: 5px solid var(--hint-border)` — KHÔNG dùng
`var(--hint-bg)` (màu nền, nhạt hơn hẳn, mũi tên sẽ mờ/khó thấy) và KHÔNG cần
khai báo biến `--hint-arrow-color` hay gán màu bằng JS nữa (xem lịch sử sửa
lỗi đầy đủ ở mục 0b — đã thử cả 2 cách đó trước, đều có vấn đề). `width:0;
height:0;` tường minh + tách `border-bottom-color`/`border-top-color` riêng
(thay vì shorthand `border-color` 4 giá trị) để tránh trường hợp 1 giá trị
invalid làm hỏng cả khai báo.

### Bước 2 — JS: sửa đúng hàm `positionHintBox` (đã fix lỗi cờ lỗi thời ở trên)

```js
function positionHintBox(hintBox, btn) {
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const boxRect = hintBox.getBoundingClientRect();
    let top = rect.bottom + 6;
    if (top + boxRect.height > window.innerHeight - 8) {
        top = rect.top - boxRect.height - 6;
    }
    if (top < 8) top = 8;
    let left = rect.left;
    if (left + boxRect.width > window.innerWidth - 8) left = window.innerWidth - boxRect.width - 8;
    if (left < 8) left = 8;
    hintBox.style.top = top + 'px';
    hintBox.style.left = left + 'px';

    // THÊM — mũi tên: lấy tâm nút bấm quy đổi sang toạ độ trong lòng box
    // (sau khi box đã bị kẹp lệch), rồi kẹp lại trong biên box để mũi tên
    // không bao giờ trồi ra ngoài bo góc. Hướng mũi tên tính LẠI dựa trên
    // `top` sau khi đã kẹp — KHÔNG dùng cờ từ nhánh if/else phía trên (xem
    // giải thích ở "Lỗi thứ 3" ngay trên).
    const below = (top + boxRect.height / 2) > rect.top;
    const arrowX = Math.max(14, Math.min(boxRect.width - 14, (rect.left + rect.width / 2) - left));
    hintBox.style.setProperty('--arrow-x', arrowX + 'px');
    hintBox.classList.toggle('arrow-up', below);
    hintBox.classList.toggle('arrow-down', !below);
}
```

An toàn để patch vào file đang chạy tốt mà không sợ phá hành vi định vị top/left
gốc — phần duy nhất bị đổi so với bản đời đầu là bỏ biến `below` tạm tính sớm,
thay bằng tính 1 lần ở cuối theo vị trí `top` thật sự sau khi kẹp.

### Checklist retrofit cho 1 file cũ đã có `positionHintBox` (bản đời đầu, chưa có mũi tên hoặc có mũi tên nhưng dùng cờ `below` tính sớm)

- [ ] Thêm 3 rule CSS ở Bước 1 vào cuối `<style>` (không cần xoá gì cũ).
- [ ] Xác nhận file đã có sẵn biến `--hint-border` (dùng cho `border-left`
      của `.hint-box`) — nếu có, dùng thẳng, không cần khai báo gì thêm.
- [ ] Thay đúng thân hàm `positionHintBox` bằng bản ở Bước 2 (giữ nguyên tên
      hàm, tham số, mọi call site gọi nó không cần đổi gì) — nếu file đã có
      mũi tên nhưng dùng cờ `below` tính sớm (bản đời đầu), vẫn cần thay để
      fix lỗi thời điểm tính hướng.
- [ ] Test: mở hint ở câu gần đầu trang (box phải lật lên trên, mũi tên phải
      trỏ xuống) và câu sát mép trái/phải (mũi tên phải vẫn trỏ đúng tâm nút,
      không lệch theo mép box).

### File chưa dùng `positionHintBox` (còn dùng bản `.inline-hint` đơn giản, có `toggleHint` viết tay riêng, không theo mẫu mục 0b/5)

Ví dụ thực tế: `solution-preinterm-3d.html` (đã sửa 2026-09-07) — dùng class
`.inline-hint` (không phải `.hint-box.inline-hint`), hàm `toggleHint` viết
tay riêng trong chính file, không có `positionHintBox`/`repositionCurrentHint`
tách riêng. Khuyến nghị: **chuyển hẳn sang mẫu `positionHintBox` đầy đủ ở
mục 0b/5** (đã có sẵn mũi tên + khả năng lật + reposition khi cuộn/resize +
tự đóng khi nút neo cuộn khuất, tất cả tích hợp sẵn từ đầu) thay vì ghép vá
riêng lẻ vào hàm `toggleHint` cục bộ, để tránh duy trì 2 cách viết khác nhau
song song trong cùng dự án.

---

## 5. Quy trình làm ngay (KHÔNG CẦN SCAN CORE)

Vì reference implementation (`positionHintBox` + `repositionCurrentHint` + `toggleHint`) tự chạy độc lập và tối ưu hơn `access-core.js`, **mặc định áp dụng luôn cho mọi file**, không cần quét hay kiểm tra thứ tự của `access-core.js`.

Chỉ cần làm đúng 4 việc trong **1 lần thay thế duy nhất**:

1. **CSS**: Thêm block `.hint-box.inline-hint` (đã gồm sẵn mũi tên) vào cuối `<style>` (nếu chưa có):
```css
        /* Hint popup - chuẩn hóa vị trí nổi cạnh nút i, tương thích access-core.js */
        .hint-box.inline-hint {
            position: fixed;
            top: auto;
            left: auto;
            margin-top: 0;
            max-width: 380px;
            width: max-content;
            white-space: normal;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
            z-index: 9999;
        }
        .hint-box.inline-hint::after {
            content: "";
            display: block;
            position: absolute;
            left: var(--arrow-x, 20px);
            width: 0;
            height: 0;
            transform: translateX(-50%);
            border: 8px solid transparent;
            pointer-events: none;
        }
        /* Box nằm DƯỚI nút (mặc định) → mũi tên ở mép trên, trỏ LÊN */
        .hint-box.inline-hint.arrow-up::after {
            bottom: 100%;
            border-bottom-color: var(--hint-border);
        }
        /* Box bị lật lên TRÊN nút (tràn đáy màn hình) → mũi tên ở mép dưới, trỏ XUỐNG */
        .hint-box.inline-hint.arrow-down::after {
            top: 100%;
            border-top-color: var(--hint-border);
        }
```
   `white-space: normal` + `width: max-content` là bắt buộc (xem Bước 3b, mục 2) —
   nếu bỏ qua, chữ trong hint có thể tràn ra ngoài khung khi `.hint-box` nằm trong
   1 wrapper có `white-space: nowrap` (khá phổ biến ở các hàng input/eye-btn/hint-btn).
   Mũi tên dùng thẳng `var(--hint-border)` (biến màu viền đậm sẵn có, dùng chung với
   `border-left` của `.hint-box`) — KHÔNG dùng `var(--hint-bg)` (màu nền, quá nhạt,
   mũi tên sẽ mờ khó thấy) và không cần khai báo biến màu riêng nào khác (xem lịch sử
   sửa lỗi đầy đủ ở mục 0b để biết vì sao 2 cách làm trước đó đều có vấn đề).

2. **JS**: Thay 2 dòng `closeAllHints` + `toggleHint` đơn giản bằng **bộ reference implementation đầy đủ**:
```javascript
        let currentHintBtn = null;

        function positionHintBox(hintBox, btn) {
            if (!btn) return;
            const rect = btn.getBoundingClientRect();
            const boxRect = hintBox.getBoundingClientRect();
            let top = rect.bottom + 6;
            if (top + boxRect.height > window.innerHeight - 8) top = rect.top - boxRect.height - 6;
            if (top < 8) top = 8;
            let left = rect.left;
            if (left + boxRect.width > window.innerWidth - 8) left = window.innerWidth - boxRect.width - 8;
            if (left < 8) left = 8;
            hintBox.style.top = top + 'px';
            hintBox.style.left = left + 'px';

            // Mũi tên: hướng tính LẠI dựa trên `top` sau khi đã kẹp — không dùng
            // cờ từ nhánh if/else phía trên (dễ lỗi thời khi bị kẹp lần 2, xem mục 4d)
            const below = (top + boxRect.height / 2) > rect.top;
            const arrowX = Math.max(14, Math.min(boxRect.width - 14, (rect.left + rect.width / 2) - left));
            hintBox.style.setProperty('--arrow-x', arrowX + 'px');
            hintBox.classList.toggle('arrow-up', below);
            hintBox.classList.toggle('arrow-down', !below);
        }

        // Xem mục 4c — nếu nút neo đã cuộn khuất hẳn khỏi viewport, tự đóng
        // hint thay vì kẹp mép (tránh hint dính đè lên nội dung không liên quan)
        function isBtnOffScreen(btn) {
            if (!btn || !btn.isConnected) return true;
            const r = btn.getBoundingClientRect();
            return r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth;
        }

        function repositionCurrentHint() {
            if (!currentHintBtn) return;
            if (isBtnOffScreen(currentHintBtn)) { closeAllHints(); return; }
            const open = document.querySelector('.hint-box[style*="display: block"]');
            if (open) positionHintBox(open, currentHintBtn);
        }

        function closeAllHints() {
            document.querySelectorAll('.hint-box').forEach(h => h.style.display = 'none');
            currentHintBtn = null;
        }

        function toggleHint(event, id) {
            if (event) event.stopPropagation();
            const h = document.getElementById(id);   // hoặc getElementById(id + '-hint')
                                                       // — theo đúng quy ước id sẵn có
                                                       // của file, xem lưu ý ở mục 0b
            if (!h) return;
            const isVisible = h.style.display === 'block';
            closeAllHints();
            if (isVisible) return;
            h.style.display = 'block';
            const btn = event ? (event.currentTarget || event.target) : null;
            currentHintBtn = btn;
            positionHintBox(h, btn);
        }

        window.addEventListener('scroll', repositionCurrentHint, true);
        window.addEventListener('resize', repositionCurrentHint);
```

3. **HTML / Render functions**: Thêm class `inline-hint` vào mọi `<div class="hint-box" ...>` trong các hàm render bài tập.

   (Mũi tên đã tự chạy đúng ngay khi làm xong bước 1–2 ở trên — không cần làm
   thêm bước nào nữa. Mục 4d giờ chỉ dùng khi cần retrofit 1 file cũ đã lỡ
   triển khai `positionHintBox` đời đầu, không có mũi tên hoặc có nhưng bị lỗi
   thời điểm tính hướng.)

4. **Lưới an toàn thứ tự script** (xem mục 0c): thêm ngay sau khối JS ở bước 2 —
```javascript
        window.addEventListener('load', () => { window.toggleHint = toggleHint; });
```
   (hoặc thêm dòng `window.toggleHint = toggleHint;` vào cuối `window.onload` đã có
   sẵn trong file, nếu file dùng kiểu đó) — đảm bảo bản cục bộ luôn thắng, không cần
   tự kiểm tra/đảo thứ tự thẻ `<script src="access-core.js">`.

---

## 6. Ghi chú công cụ (khi AI hỗ trợ sửa file bằng tool gọi lệnh)

Khi grep/xem nội dung 1 dòng HTML-trong-template-string dài (kiểu
`class="hint-box" id="${qid}-hint"`), kết quả hiển thị qua một số tool có thể lồng
thêm dấu `\"` để escape cho định dạng hiển thị JSON của chính tool đó — **đây chỉ là
hiệu ứng hiển thị, không phải nội dung thật trong file**. Trước khi viết script
tìm-thay-thế dựa trên mẫu có dấu `\"`, luôn xác nhận lại byte thật bằng cách ghi
thẳng ra `stdout` dạng nhị phân (vd `sys.stdout.buffer.write(...)` trong Python) —
nếu chỉ tin vào những gì tool hiển thị, script thay thế có thể chạy "thành công" (0
lỗi) nhưng thật ra khớp 0 lần vì mẫu tìm kiếm sai định dạng so với file gốc.