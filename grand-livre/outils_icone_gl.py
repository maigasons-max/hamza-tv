from PIL import Image, ImageDraw

T = 512
im = Image.new("RGB", (T, T), (18, 15, 11))
d = ImageDraw.Draw(im)

d.rounded_rectangle([16, 16, T - 16, T - 16], radius=104, fill=(24, 20, 14), outline=(201, 162, 39), width=6)

# livre ouvert : deux pages creme
gauche = [(96, 200), (250, 176), (250, 372), (96, 356)]
droite = [(262, 176), (416, 200), (416, 356), (262, 372)]
d.polygon(gauche, fill=(238, 231, 214))
d.polygon(droite, fill=(250, 245, 233))

# tranche doree au centre
d.polygon([(250, 176), (262, 176), (262, 372), (250, 372)], fill=(201, 162, 39))

# lignes d ecriture
for i in range(4):
    y = 218 + i * 34
    d.line([(118, y + 6), (232, y - 2)], fill=(60, 52, 40), width=6)
    d.line([(280, y - 2), (394, y + 6)], fill=(60, 52, 40), width=6)

# piece d or
d.ellipse([332, 330, 452, 450], fill=(201, 162, 39), outline=(122, 96, 22), width=5)
d.ellipse([352, 350, 432, 430], outline=(255, 240, 196), width=4)
d.line([(392, 366), (392, 414)], fill=(24, 20, 14), width=8)
d.line([(376, 382), (408, 382)], fill=(24, 20, 14), width=7)
d.line([(376, 398), (404, 398)], fill=(24, 20, 14), width=7)

im.save("apk-factory/icone_grandlivre.png", optimize=True)
print("icone grand livre prete", im.size)
