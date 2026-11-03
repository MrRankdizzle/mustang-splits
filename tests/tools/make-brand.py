#!/usr/bin/env python3
# Builds the bundled brand files in brand/ from the two source files the coach supplied (3.23):
#   brand/LC_Logo.png      -> lc-logo.png (2000 px master, trimmed, transparent), lc-logo@1x/@2x/@3x.png (240 / 480 / 720 px wide)
#   brand/Mustang_Logo.svg -> mustang-navy.svg, mustang-carolina.svg, mustang-sky.svg, mustang-white.svg, mustang-knockout.svg
# The LC file is already transparent (its white is the outline of the mark); near-white pixels at the edge are made transparent
# and the image is trimmed to the mark. The Mustang file keeps its vectors: the black (#231f20) is recoloured, the white kept
# (white variant: navy inside), the knockout is one colour with the white areas cut out; the viewBox is trimmed to the horse.
# Run from the repo folder: python3 tests/tools/make-brand.py   (needs Pillow)
import re, os
from PIL import Image
B='brand'
im=Image.open(os.path.join(B,'LC_Logo.png')).convert('RGBA')
px=im.load(); W,H=im.size
for y in range(H):
    for x in range(W):
        r,g,b,a=px[x,y]
        if a and r>=250 and g>=250 and b>=250 and (x<2 or y<2 or x>W-3 or y>H-3): px[x,y]=(r,g,b,0)  # a white edge pixel is background
bbox=im.getchannel('A').getbbox(); im=im.crop(bbox)
pad=int(max(im.size)*0.02); im2=Image.new('RGBA',(im.width+2*pad,im.height+2*pad),(0,0,0,0)); im2.paste(im,(pad,pad)); im=im2
master=im.resize((2000,round(2000*im.height/im.width)),Image.LANCZOS); master.save(os.path.join(B,'lc-logo.png'),optimize=True)
for k,w in [('1x',240),('2x',480),('3x',720)]:
    im.resize((w,round(w*im.height/im.width)),Image.LANCZOS).save(os.path.join(B,f'lc-logo@{k}.png'),optimize=True)
print('lc-logo', master.size, 'trimmed from', bbox)
svg=open(os.path.join(B,'Mustang_Logo.svg'),encoding='utf-8').read()
# the horse's bounding box, measured on a render of the original canvas (1920 x 1080 px, viewBox 1440 x 810): x 572-1348, y 1-1080
vb='423 0 594 810'
svg=re.sub(r'width="1920"','width="594"',svg,1); svg=re.sub(r'height="1080"','height="810"',svg,1); svg=re.sub(r'viewBox="[^"]*"',f'viewBox="{vb}"',svg,1)
def variant(name,dark,white):
    s=svg.replace('fill="#231f20"',f'fill="{dark}"')
    s=s.replace('fill="#ffffff"','fill="none"' if white is None else f'fill="{white}"')
    open(os.path.join(B,f'mustang-{name}.svg'),'w',encoding='utf-8').write(s)
variant('navy','#13294b','#ffffff'); variant('carolina','#4b9cd3','#ffffff'); variant('sky','#bfe3f7','#13294b'); variant('white','#ffffff','#13294b'); variant('knockout','#13294b',None)
print('mustang variants written')
