import { useState } from 'react'
import { parseHtml } from './render.jsx'
import sections from './sections.json'

const faqHome = sections['faq-home'] || ''

// pull each disclosure button's exact inner HTML (question + expand icon)
const buttonInner = [...faqHome.matchAll(
  /<button[^>]*class="disclosureButton[^"]*"[^>]*>([\s\S]*?)<\/button>/g,
)].map((m) => m[1])

const answers = [
  'Opening an account is quick and free. Sign up in minutes, fund your account via ACH cash contribution, IRA transfer, or a 401(k) / TSP / 403(b) / 457 rollover — including In-Kind Crypto Transfers — then buy and sell crypto, stocks, and precious metals from a single dashboard.',
  'There are $0 monthly or annual account fees, no startup fees, and no exit fees. Cryptocurrency trades carry a flat 1% transaction fee, and gold and silver are offered at a competitive over-spot price per ounce. The estimated execution price includes all iTrustCapital fees, prior to buying or selling. All fees are subject to change.',
  'A single iTrustCapital account gives you access to 90+ cryptocurrencies, stocks & ETFs, and physical gold and silver — all on one platform, inside your tax-advantaged retirement account.',
  'Buy transactions have a $20 minimum and a $500,000 maximum per order; sell transactions have a $30 minimum and a $250,000 maximum per order. Account contribution limits follow IRS guidelines for retirement accounts. Please refer to the platform for current limits.',
  'Trades inside your IRA are not taxed as they occur, so you can rebalance and grow your portfolio without triggering capital gains events. With a Traditional IRA, contributions may be tax-deductible and taxes are paid at withdrawal; with a Roth IRA, qualified withdrawals are tax-free. Some taxes and conditions may apply — please consult a tax professional.',
  'A Crypto IRA is a retirement account with tax advantages, while a standard exchange is a taxable account. With iTrustCapital, digital assets are held in a self-directed IRA with institutional-grade custody and your trades are not taxed as they happen; on a taxable exchange, you owe capital gains tax on every sale. Because the account is a retirement account, you can also move funds between assets without creating a taxable event.',
]

export default function Faq() {
  const [open, setOpen] = useState(0)

  return (
    <section className="my-16 relative">
      <section id="faq-home" className="faqAccordian-wrapper main-container w-11/12 mx-auto">
        <h2 className="px-4 mx-auto mb-8 text-4xl text-white text-center font-semibold">
          Frequently Asked Questions
        </h2>
        <div className="faqAccordian flex flex-col gap-3 max-w-screen-xl mx-auto">
          {buttonInner.map((inner, i) => {
            const isOpen = open === i
            return (
              <div key={i} data-headlessui-state="">
                <div className="bg-white/5 border rounded-xl p-5 flex flex-col gap-y-4 py-5 has-[.disclosureButton:hover]:border-white has-[.disclosureButton:hover]:transition border-glass-edge">
                  <button
                    className="disclosureButton flex gap-4 w-full justify-between text-white text-md font-semibold text-left focus:outline-none focus-visible:ring focus-visible:ring-itcBlue-500 focus-visible:ring-opacity-75"
                    type="button"
                    aria-expanded={isOpen}
                    data-headlessui-state=""
                    onClick={() => setOpen(isOpen ? -1 : i)}
                  >
                    {parseHtml(inner)}
                  </button>
                  {isOpen && (
                    <div className="faq-panel text-white/70 text-sm font-light leading-relaxed">
                      {answers[i]}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </section>
  )
}
