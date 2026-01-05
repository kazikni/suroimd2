import { TabApp, TabManager } from "../managers/tabManager.ts";

export interface Message {
    sender: string
    text: string
    time: number
}

export interface Contact {
    id: string
    visible: boolean
    can_talk: boolean
    name: string
    icon: string
}
export class MessageTabApp extends TabApp{
    contacts: Record<string, Contact> = {}
    messages: Record<string, Message[]> = {}
    currentContact?: string
    messagesContainer!: HTMLDivElement
    override on_run(): void {
        this.element!.classList.add("tab-message-app");
        this.element!.innerHTML = `
<div class="contacts-panel">
</div>
<div class="chat-panel">
    <div class="chat-header">
    </div>
    <div class="chat-messages"></div>
    <div class="chat-input">
        <input type="text" id="tab-message-app-input-msg" placeholder="Type A Message..." />
        <button id="tab-message-app-send-button">➤</button>
    </div>
</div>
`
    
        this.messagesContainer = this.element!.querySelector(".chat-messages")!;

        this.renderContacts();

        this.currentContact = "self";
        this.renderMessages("self");
        this.updateHeaderName("My Notes");

        const btn = this.element!.querySelector("#tab-message-app-send-button")!;
        const input = this.element!.querySelector("#tab-message-app-input-msg")! as HTMLInputElement;
    
        /*btn.onclick = () => {
            this.sendCurrent(input.value);
            input.value = "";
        };*/
    }
    initiliaze(){
        
    }
    override on_stop(): void {
    }
    override on_tick(dt: number): void {
    }
    addMessage(text: string, from: "you" | "other") {
        if (!this.messagesContainer) return
        const msg = document.createElement("div")
        msg.classList.add("msg", from === "you" ? "sent" : "received")
        msg.innerText = text
        this.messagesContainer.appendChild(msg)

        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight
    }
    constructor(tab: TabManager) {
        super("ChitChat", "/img/menu/gui/tab/icons/message_app.svg", tab);

        this.registerContact({
            id: "self",
            name: "My Notes",
            icon: "A",
            visible: true,
            can_talk: true
        })

        this.registerContact({
            id: "team",
            name: "Team Chat",
            icon: "T",
            visible: false,
            can_talk: true
        })

        this.registerContact({
            id: "killfeed",
            name: "Match",
            icon: "M",
            visible: true,
            can_talk: false
        })

        this.registerContact({
            id: "administration",
            name: "Administration",
            icon: "⚠",
            visible: false,
            can_talk: false
        });

        this.tab.game.signals.on("killfeed_message",(msg:{text:string})=>{
            this.addMessageTo("killfeed","received",msg.text)
        })
    }
    registerContact(c: Contact) {
        this.contacts[c.id] = c;
        this.messages[c.id] = [];
    }
    clear(){
        for(const c of Object.keys(this.contacts)){
            this.messages[c].length=0
        }
    }
    addMessageTo(contactId: string, sender: string, text: string) {
        if (!this.messages[contactId]) this.messages[contactId] = [];
    
        this.messages[contactId].push({
            sender,
            text,
            time: performance.now()
        });

        if (this.currentContact === contactId) {
            this.renderMessages(contactId);
        }
    }
    sanitizeHTML(html: string) {
        const template = document.createElement("template");
        template.innerHTML = html;
    
        const allowedTags = new Set(["IMG", "SPAN", "B", "I", "EM", "STRONG"]);
        const allowedAttrs = new Set(["src", "class", "alt"]);
    
        const clean = (node: Node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
    
                if (!allowedTags.has(el.tagName)) {
                    el.replaceWith(...Array.from(el.childNodes));
                    return;
                }

                // deno-lint-ignore ban-ts-comment
                //@ts-ignore
                for (const attr of [...el.attributes]) {
                    if (!allowedAttrs.has(attr.name)) el.removeAttribute(attr.name);
                }
            }

            // deno-lint-ignore ban-ts-comment
            //@ts-ignore
            for (const child of [...node.childNodes]) clean(child);
        };
    
        clean(template.content);
        return template.innerHTML;
    }    
    renderMessages(contactId: string) {
        if (!this.messagesContainer) return;
    
        const msgs = this.messages[contactId];
        this.messagesContainer.innerHTML = "";
    
        for (const m of msgs) {
            const div = document.createElement("div");
            div.classList.add("msg");
    
            div.classList.add(
                m.sender === "you"
                    ? "sent"
                    : m.sender === "system"
                    ? "received"
                    : "received"
            );
    
            div.innerHTML=this.sanitizeHTML(m.text);
            this.messagesContainer.appendChild(div);
        }
    
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    renderContacts() {
        const contactPanel = this.element!.querySelector(".contacts-panel")!;
        contactPanel.innerHTML = "";
    
        for (const id in this.contacts) {
            const c = this.contacts[id];
            if (!c.visible) continue;
    
            const div = document.createElement("div");
            div.classList.add("contact");
            div.innerHTML = `
                <div class="avatar">${c.icon}</div>
                <div class="contact-info">
                    <div class="contact-name">${c.name}</div>
                </div>
            `;
    
            div.onclick = () => {
                this.currentContact = id;
                this.renderMessages(id);
                this.updateHeaderName(c.name);
            };
    
            contactPanel.appendChild(div);
        }
    }
    updateHeaderName(name: string) {
        const el = this.element!.querySelector(".chat-contact");
        if (el) el.innerHTML = name;
    }
}