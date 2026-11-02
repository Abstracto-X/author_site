from PIL import Image
from pathlib import Path
p=Path(__file__).parent
src=Image.open('/mnt/data/a_dark_high_detail_realistic_game_style_png_compo.png')
(p/'assets').mkdir(exist_ok=True)
for i,name in enumerate(['licker','tyrant','nemesis']):
    crop=src.crop((i*724,0,(i+1)*724,724))
    crop.save(p/'assets'/f'{name}-frame.png',optimize=True)
for name,source in [('evil-frame','/mnt/data/ornate_haunted_manor_gothic_frame.png'),('evil-alternate','/mnt/data/horror_shack_grunge_avatar_frame.png'),('evil-red-ornate','/mnt/data/a_high_contrast_vector_style_ornate_circular_frame.png')]:
    im=Image.open(source)
    im.thumbnail((1000,1000))
    im.save(p/'assets'/f'{name}.png',optimize=True)
