# Telegram Product Mini App

Telegram bot ရဲ့ `/products` command မှ `Open Products` button နှိပ်ပြီး Telegram အတွင်းမှာ product catalog ဖွင့်ရန် ပြုလုပ်ထားသော Mini App ဖြစ်သည်။ Product API bearer token ကို frontend သို့မပို့ဘဲ Node server က proxy လုပ်ပေးသည်။

## 1. Product API ချိတ်ရန်

`.env.example` ကို `.env` အဖြစ် copy လုပ်ပြီး အောက်ပါတန်ဖိုးများ ဖြည့်ပါ။

```env
PRODUCT_API_URL=https://test.odoo.rootaccessmyanmar.com/json/2/product.product/search_read
PRODUCT_API_METHOD=POST
PRODUCT_API_TOKEN=your-secret-token
PRODUCT_API_BODY={"domain":[["active","=",true],["id","!=",2]],"fields":["id","display_name","default_code","barcode","lst_price","qty_available","uom_id"],"limit":100,"offset":0,"order":"id asc"}
```

Local စမ်းရန် `.env.example` ကို `.env` အဖြစ် copy လုပ်ပြီး token အမှန်ထည့်ပါ။ ပြီးလျှင် အောက်ပါ command ဖြင့် run ပါ။

```bash
npm start
```

ပြီးနောက် browser မှာ `http://localhost:3000` ကိုဖွင့်ပါ။ Node 18+ လိုအပ်သည်။

## 2. HTTPS ဖြင့် host လုပ်ရန်

Telegram Mini App URL သည် public `https://` URL ဖြစ်ရမည်။ Render, Railway, Fly.io, VPS + reverse proxy စသည်ဖြင့် deploy လုပ်နိုင်သည်။ Deploy ပြီးရရှိသည့် URL ကို `n8n/open-app-message.json` ထဲက `https://YOUR-DOMAIN.example/` နေရာမှာ အစားထိုးပါ။

## 3. BotFather ပြင်ရန်

BotFather တွင် `/mybots` → သက်ဆိုင်ရာ bot → **Bot Settings** → **Domain** (သို့) **Configure Mini App** မှ deploy လုပ်ထားသော domain ကို သတ်မှတ်ပါ။

## 4. n8n workflow ပြင်ရန်

လက်ရှိ `/products` branch ရဲ့ `Get Products from Odoo` → `Format Product List` → `Send Product List` nodes အစား Telegram **Send Message** node တစ်ခုတည်း ချိတ်ပါ။

- Chat ID: `={{ $json.message.chat.id }}`
- Text: `📦 Product စာရင်းကို App ထဲမှာ ကြည့်နိုင်ပါတယ်။`
- Reply Markup: JSON mode သုံးပြီး `n8n/open-app-message.json` ထဲက `replyMarkup` value ထည့်ပါ။

ဒီနည်းနဲ့ Odoo/API request ကို n8n chat workflow ကမခေါ်တော့ဘဲ Mini App server ရဲ့ `/api/products` ကသာ ခေါ်ပါမည်။

## Supported API response shapes

Frontend proxy သည် array ကို အောက်ပါ response ပုံစံများမှ အလိုအလျောက်ရှာပေးသည်။

```json
[{ "id": 1, "name": "Product", "list_price": 5000, "qty_available": 100 }]
```

သို့မဟုတ် `products`, `data`, `data.products`, `result`, `result.products`, `result.records` အောက်တွင် array ရှိနိုင်သည်။ Field names အတွက် `name/display_name/title`, `lst_price/list_price/price/sale_price`, `qty_available/stock/quantity/qty`, `image_url/image/thumbnail` ကိုထောက်ပံ့ထားသည်။
