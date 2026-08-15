/* =========================================================
   AURORA EXCHANGE
   LIVE CURRENCY ENGINE
   Powered by Frankfurter API
========================================================= */


/* =========================================================
   API
========================================================= */

const API_BASE =
    "https://api.frankfurter.dev/v2";


/* =========================================================
   ELEMENTS
========================================================= */

const amount =
    document.getElementById("amount");

const fromCurrency =
    document.getElementById("fromCurrency");

const toCurrency =
    document.getElementById("toCurrency");

const result =
    document.getElementById("result");

const rate =
    document.getElementById("rate");

const change =
    document.getElementById("change");

const convertBtn =
    document.getElementById("convertBtn");

const swapBtn =
    document.getElementById("swapBtn");

const middleSwap =
    document.getElementById("middleSwap");

const toast =
    document.getElementById("toast");

const time =
    document.getElementById("time");

const particles =
    document.getElementById("particles");


/* =========================================================
   FALLBACK RATES
   تستخدم فقط عند عدم توفر الإنترنت/API
========================================================= */

const fallbackRates = {

    USD: 1,

    EUR: 0.92,

    GBP: 0.78,

    SAR: 3.75,

    AED: 3.6725,

    YER: 250,

    KWD: 0.307,

    QAR: 3.64,

    JPY: 157.20,

    CNY: 7.18,

    KRW: 1380,

    TRY: 40.80

};


/* =========================================================
   STATE
========================================================= */

let liveRates = {};

let apiOnline = false;

let isLoading = false;


/* =========================================================
   SAFE NUMBER
========================================================= */

function safeNumber(value) {

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {

        return 0;
    }

    return number;
}


/* =========================================================
   FORMAT MONEY
========================================================= */

function formatMoney(value) {

    value =
        safeNumber(value);


    if (
        value === 0
    ) {

        return "0.00";
    }


    return value.toLocaleString(
        "en-US",
        {
            minimumFractionDigits:
                value >= 1 ? 2 : 2,

            maximumFractionDigits:
                value >= 1 ? 6 : 8
        }
    );
}


/* =========================================================
   GET FALLBACK RATE
========================================================= */

function getFallbackRate(
    from,
    to
) {

    const fromRate =
        fallbackRates[from];

    const toRate =
        fallbackRates[to];


    if (
        !fromRate ||
        !toRate
    ) {

        return null;
    }


    return (
        toRate /
        fromRate
    );
}


/* =========================================================
   GET LIVE RATE
========================================================= */

async function getLiveRate(
    from,
    to
) {

    if (
        from === to
    ) {

        return 1;
    }


    const url =
        `${API_BASE}/rate/${encodeURIComponent(from)}/${encodeURIComponent(to)}`;


    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            function () {

                controller.abort();

            },
            10000
        );


    try {

        const response =
            await fetch(
                url,
                {
                    method: "GET",

                    cache: "no-store",

                    signal:
                        controller.signal
                }
            );


        clearTimeout(
            timeout
        );


        if (
            !response.ok
        ) {

            throw new Error(
                "API STATUS " +
                response.status
            );
        }


        const data =
            await response.json();


        const apiRate =
            Number(
                data.rate
            );


        if (
            !Number.isFinite(
                apiRate
            ) ||
            apiRate <= 0
        ) {

            throw new Error(
                "INVALID RATE"
            );
        }


        return apiRate;

    } catch (error) {

        clearTimeout(
            timeout
        );

        throw error;
    }
}


/* =========================================================
   SAVE RATE
========================================================= */

function saveRate(
    from,
    to,
    value
) {

    const key =
        `${from}_${to}`;


    liveRates[key] =
        {
            value: value,

            time:
                Date.now()
        };


    try {

        localStorage.setItem(
            "aurora_live_rates",
            JSON.stringify(
                liveRates
            )
        );

    } catch (error) {

        console.warn(
            "LocalStorage unavailable"
        );
    }
}


/* =========================================================
   LOAD SAVED RATES
========================================================= */

function loadSavedRates() {

    try {

        const saved =
            localStorage.getItem(
                "aurora_live_rates"
            );


        if (
            saved
        ) {

            const parsed =
                JSON.parse(
                    saved
                );


            if (
                parsed &&
                typeof parsed ===
                "object"
            ) {

                liveRates =
                    parsed;
            }
        }

    } catch (error) {

        liveRates = {};
    }
}


/* =========================================================
   GET SAVED RATE
========================================================= */

function getSavedRate(
    from,
    to
) {

    const key =
        `${from}_${to}`;


    const saved =
        liveRates[key];


    if (
        !saved
    ) {

        return null;
    }


    if (
        typeof saved ===
        "number"
    ) {

        return saved;
    }


    if (
        Number.isFinite(
            Number(
                saved.value
            )
        )
    ) {

        return Number(
            saved.value
        );
    }


    return null;
}


/* =========================================================
   GET RATE WITH FALLBACK
========================================================= */

async function resolveRate(
    from,
    to
) {

    try {

        const liveRate =
            await getLiveRate(
                from,
                to
            );


        apiOnline = true;


        saveRate(
            from,
            to,
            liveRate
        );


        return {
            rate: liveRate,

            source: "LIVE"
        };

    } catch (error) {

        console.warn(
            "Live API unavailable:",
            error
        );


        apiOnline = false;


        /* -----------------------------------------
           LAST SUCCESSFUL RATE
        ----------------------------------------- */

        const savedRate =
            getSavedRate(
                from,
                to
            );


        if (
            savedRate
        ) {

            return {
                rate: savedRate,

                source: "CACHE"
            };
        }


        /* -----------------------------------------
           FALLBACK RATE
        ----------------------------------------- */

        const fallback =
            getFallbackRate(
                from,
                to
            );


        if (
            fallback
        ) {

            return {
                rate: fallback,

                source: "FALLBACK"
            };
        }


        return {
            rate: null,

            source: "NONE"
        };
    }
}


/* =========================================================
   MAIN CONVERSION
========================================================= */

async function convert(
    showMessage = false
) {

    if (
        isLoading
    ) {

        return;
    }


    const value =
        parseFloat(
            amount.value
        );


    if (
        !Number.isFinite(
            value
        ) ||
        value < 0
    ) {

        result.textContent =
            "0.00";

        rate.textContent =
            "—";

        return;
    }


    const from =
        fromCurrency.value;

    const to =
        toCurrency.value;


    isLoading = true;


    if (
        convertBtn
    ) {

        convertBtn.classList.add(
            "loading"
        );
    }


    try {

        const response =
            await resolveRate(
                from,
                to
            );


        const exchangeRate =
            response.rate;


        /* =========================================
           NO RATE
        ========================================= */

        if (
            !exchangeRate
        ) {

            result.textContent =
                "—";


            rate.textContent =
                "تعذر الحصول على السعر";


            change.textContent =
                "OFFLINE";


            change.style.color =
                "var(--red)";


            if (
                showMessage
            ) {

                showToast(
                    "⚠ تعذر الاتصال بخدمة الأسعار"
                );
            }


            return;
        }


        /* =========================================
           CALCULATE
        ========================================= */

        const converted =
            value *
            exchangeRate;


        result.textContent =
            formatMoney(
                converted
            );


        rate.textContent =
            `1 ${from} = ${formatMoney(exchangeRate)} ${to}`;


        /* =========================================
           STATUS
        ========================================= */

        if (
            response.source ===
            "LIVE"
        ) {

            change.textContent =
                "LIVE";


            change.style.color =
                "var(--green)";

        } else if (
            response.source ===
            "CACHE"
        ) {

            change.textContent =
                "CACHED";


            change.style.color =
                "var(--cyan)";

        } else {

            change.textContent =
                "OFFLINE";


            change.style.color =
                "var(--red)";
        }


        /* =========================================
           MESSAGE
        ========================================= */

        if (
            showMessage
        ) {

            if (
                response.source ===
                "LIVE"
            ) {

                showToast(
                    "✓ تم تحديث السعر مباشرة من السوق"
                );

            } else if (
                response.source ===
                "CACHE"
            ) {

                showToast(
                    "◈ تم استخدام آخر سعر محفوظ"
                );

            } else {

                showToast(
                    "⚠ تم استخدام السعر الاحتياطي"
                );
            }


            pulseResult();
        }

    } finally {

        isLoading =
            false;


        if (
            convertBtn
        ) {

            convertBtn.classList.remove(
                "loading"
            );
        }
    }
}


/* =========================================================
   CONVERT BUTTON
========================================================= */

if (
    convertBtn
) {

    convertBtn.addEventListener(
        "click",
        function () {

            convert(true);

        }
    );
}


/* =========================================================
   AMOUNT INPUT
========================================================= */

if (
    amount
) {

    amount.addEventListener(
        "input",
        function () {

            convert(false);

        }
    );
}


/* =========================================================
   FROM CURRENCY
========================================================= */

if (
    fromCurrency
) {

    fromCurrency.addEventListener(
        "change",
        function () {

            convert(false);

        }
    );
}


/* =========================================================
   TO CURRENCY
========================================================= */

if (
    toCurrency
) {

    toCurrency.addEventListener(
        "change",
        function () {

            convert(false);

        }
    );
}


/* =========================================================
   SWAP
========================================================= */

function swapCurrencies() {

    const oldFrom =
        fromCurrency.value;


    const oldTo =
        toCurrency.value;


    fromCurrency.value =
        oldTo;


    toCurrency.value =
        oldFrom;


    convert(true);
}


if (
    swapBtn
) {

    swapBtn.addEventListener(
        "click",
        swapCurrencies
    );
}


if (
    middleSwap
) {

    middleSwap.addEventListener(
        "click",
        swapCurrencies
    );
}


/* =========================================================
   RESULT ANIMATION
========================================================= */

function pulseResult() {

    if (
        !result ||
        !result.animate
    ) {

        return;
    }


    result.animate(
        [
            {
                transform:
                    "scale(1)"
            },

            {
                transform:
                    "scale(1.08)"
            },

            {
                transform:
                    "scale(1)"
            }
        ],
        {
            duration: 450,

            easing:
                "cubic-bezier(.2,.8,.2,1)"
        }
    );
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer;


function showToast(
    message
) {

    if (
        !toast
    ) {

        return;
    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            function () {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );
}


/* =========================================================
   CLOCK
========================================================= */

function updateClock() {

    if (
        !time
    ) {

        return;
    }


    const now =
        new Date();


    const h =
        String(
            now.getHours()
        ).padStart(
            2,
            "0"
        );


    const m =
        String(
            now.getMinutes()
        ).padStart(
            2,
            "0"
        );


    const s =
        String(
            now.getSeconds()
        ).padStart(
            2,
            "0"
        );


    time.textContent =
        `${h}:${m}:${s}`;
}


setInterval(
    updateClock,
    1000
);


updateClock();


/* =========================================================
   PARTICLES
========================================================= */

if (
    particles
) {

    for (
        let i = 0;
        i < 120;
        i++
    ) {

        const particle =
            document.createElement(
                "div"
            );


        particle.className =
            "particle";


        particle.style.left =
            `${Math.random() * 100}%`;


        particle.style.animationDuration =
            `${8 + Math.random() * 20}s`;


        particle.style.animationDelay =
            `-${Math.random() * 20}s`;


        particle.style.opacity =
            `${Math.random() * 0.45}`;


        particles.appendChild(
            particle
        );
    }
}


/* =========================================================
   DYNAMIC COLOR ENGINE
========================================================= */

let hue =
    Math.random() * 360;


function colorEngine() {

    hue =
        (
            hue +
            0.35
        ) % 360;


    const color1 =
        `hsl(${hue},92%,62%)`;


    const color2 =
        `hsl(${(hue + 85) % 360},92%,60%)`;


    const color3 =
        `hsl(${(hue + 190) % 360},92%,62%)`;


    document.documentElement
        .style
        .setProperty(
            "--cyan",
            color1
        );


    document.documentElement
        .style
        .setProperty(
            "--violet",
            color2
        );


    document.documentElement
        .style
        .setProperty(
            "--pink",
            color3
        );


    requestAnimationFrame(
        colorEngine
    );
}


colorEngine();


/* =========================================================
   AUTO REFRESH
   كل 5 دقائق
========================================================= */

setInterval(
    function () {

        convert(false);

    },
    5 * 60 * 1000
);


/* =========================================================
   LOAD SAVED DATA
========================================================= */

loadSavedRates();


/* =========================================================
   INITIAL START
========================================================= */

window.addEventListener(
    "load",
    function () {

        convert(false);

    }
);
