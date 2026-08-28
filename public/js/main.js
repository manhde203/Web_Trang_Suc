(function () {
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('categoryNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    var isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
})();

(function () {
  var province = document.getElementById('province');
  var district = document.getElementById('district');
  var ward = document.getElementById('ward');
  if (!province || !district || !ward) return;

  var apiBase = 'https://provinces.open-api.vn/api/v1';
  var selectedProvinceData = null;

  function resetSelect(select, placeholder, disabled) {
    select.replaceChildren(new Option(placeholder, ''));
    select.disabled = Boolean(disabled);
  }

  function addOptions(select, entries, selectedValue) {
    entries.forEach(function (entry) {
      var option = new Option(entry.name, entry.name, false, entry.name === selectedValue);
      option.dataset.code = entry.code;
      select.add(option);
    });
  }

  function refreshPreview() {
    document.getElementById('address')?.dispatchEvent(new Event('input'));
  }

  function findSelectedOption(select) {
    return select.options[select.selectedIndex];
  }

  async function loadWards() {
    var option = findSelectedOption(district);
    var districtCode = option && option.dataset.code;
    resetSelect(ward, 'Đang tải Phường / Xã…', true);
    if (!districtCode || !selectedProvinceData) return;

    var selectedDistrict = selectedProvinceData.districts.find(function (item) {
      return String(item.code) === districtCode;
    });
    resetSelect(ward, 'Chọn Phường / Xã', false);
    addOptions(ward, (selectedDistrict && selectedDistrict.wards) || [], ward.dataset.selected);
    ward.dataset.selected = '';
    refreshPreview();
  }

  async function loadDistricts() {
    var option = findSelectedOption(province);
    var provinceCode = option && option.dataset.code;
    resetSelect(district, 'Đang tải Quận / Huyện…', true);
    resetSelect(ward, 'Chọn Quận / Huyện trước', true);
    if (!provinceCode) return;

    try {
      var response = await fetch(apiBase + '/p/' + encodeURIComponent(provinceCode) + '?depth=3');
      if (!response.ok) throw new Error('Không thể tải Quận / Huyện');
      selectedProvinceData = await response.json();
      resetSelect(district, 'Chọn Quận / Huyện', false);
      addOptions(district, selectedProvinceData.districts || [], district.dataset.selected);
      district.dataset.selected = '';
      if (district.value) await loadWards();
    } catch (error) {
      selectedProvinceData = null;
      resetSelect(district, 'Không tải được Quận / Huyện', true);
      resetSelect(ward, 'Chọn Quận / Huyện trước', true);
    }
    refreshPreview();
  }

  async function initialiseAddressSelectors() {
    try {
      var response = await fetch(apiBase + '/p/');
      if (!response.ok) throw new Error('Không thể tải Tỉnh / Thành phố');
      var provinces = await response.json();
      var previousValue = province.dataset.selected;
      resetSelect(province, 'Chọn Tỉnh / Thành phố', false);
      addOptions(province, provinces, previousValue);
      province.dataset.selected = '';
      if (province.value) await loadDistricts();
    } catch (error) {
      resetSelect(province, 'Không tải được danh sách địa chỉ', true);
    }
  }

  province.addEventListener('change', loadDistricts);
  district.addEventListener('change', loadWards);
  initialiseAddressSelectors();
})();

(function () {
  var preview = document.getElementById('addressPreview');
  if (!preview) return;

  var fields = ['address', 'ward', 'district', 'province'].map(function (id) {
    return document.getElementById(id);
  });

  function updateAddressPreview() {
    var parts = fields.map(function (field) { return field && field.value.trim(); }).filter(Boolean);
    preview.innerHTML = parts.length
      ? '<span>Địa chỉ giao hàng:</span><strong>' + parts.map(escapeHtml).join(', ') + '</strong>'
      : '<span>Địa chỉ giao hàng:</span><strong>Vui lòng chọn khu vực và nhập địa chỉ chi tiết.</strong>';
  }

  function escapeHtml(value) {
    var element = document.createElement('div');
    element.textContent = value;
    return element.innerHTML;
  }

  fields.forEach(function (field) {
    if (field) field.addEventListener('input', updateAddressPreview);
    if (field) field.addEventListener('change', updateAddressPreview);
  });
  updateAddressPreview();
})();
