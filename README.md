# Yatırım Takip Uygulaması

Bu uygulama, belirlediğiniz yatırımları (Altın, Dolar, Gümüş) takip etmenizi ve [Dünya Katılım](https://dunyakatilim.com.tr/gunluk-kurlar) sitesinden alınan güncel kurlara göre toplam varlığınızı görmenizi sağlar.

## Kurulum ve Çalıştırma

1. Terminali açın ve proje dizinine gidin.
2. Sanal ortamı aktif edin ve uygulamayı başlatın:

```bash
source venv/bin/activate
python3 app.py
```

3. Tarayıcınızda `http://127.0.0.1:5000` adresine gidin.

## Özellikler

- **Güncel Kurlar**: Otomatik olarak çekilen Altın, Dolar ve Gümüş alış fiyatları.
- **Yatırım Ekleme**: Miktar, alış fiyatı ve masraf girerek portföy oluşturma.
- **Kar/Zarar Takibi**: Anlık kurlara göre toplam kar/zarar durumu.
- **Premium Arayüz**: Modern, karanlık mod ve cam efektli tasarım.

## Notlar

- Veriler `localStorage` üzerinde tarayıcınızda saklanır. Tarayıcı önbelleğini temizlerseniz veriler kaybolabilir.
- Kurlar her 60 saniyede bir güncellenir.
