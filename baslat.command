#!/bin/bash

# Scriptin bulunduğu klasöre git
cd "$(dirname "$0")"

# Sanal ortamı aktif et
source venv/bin/activate

# Tarayıcıyı aç (uygulama başlamadan hemen önce veya biraz bekleyip açabiliriz, 
# ama burada komut sırası python çalışınca bloklanacağı için önce açmak veya arka planda açmak mantıklı)
# Ancak python app.py bloklayıcı olduğu için, tarayıcıyı açma komutunu öne alıyorum.
# Kullanıcıya kolaylık olsun diye.
open http://127.0.0.1:5000

# Uygulamayı başlat
echo "Uygulama başlatılıyor..."
python3 app.py
