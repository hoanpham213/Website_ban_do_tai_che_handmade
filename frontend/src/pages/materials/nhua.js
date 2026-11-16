import { initPage, PageHeading } from '../../app.js';
import { render } from '../../lib/dom.js';
import { MATERIAL_GROUPS } from '../../config/constants.js';
import { MaterialSections } from '../../components/material/MaterialSections.js';

const KEY = 'nhua';

initPage({
  title: MATERIAL_GROUPS[KEY].label,
  render: (main) => {
    render(main,
      PageHeading(MATERIAL_GROUPS[KEY].label, 'Sản phẩm làm từ vật liệu này'),
      MaterialSections(KEY));
  },
});
