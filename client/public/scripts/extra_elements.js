class TabsContainer extends HTMLElement{
    constructor() {
        super();
        
    }
    connectedCallback() {
        const headerPosition = this.getAttribute('header-position') || 'top';
        this.classList.add(headerPosition);
        self.requestAnimationFrame(()=>{
            const d=document.createElement("div")
            d.innerHTML=this.innerHTML
            d.classList.add("tabs-content")
            this.innerHTML=""
            this.appendChild(d)
            this.tabs = this.querySelectorAll('tab');
            this.tabButtons = [];
            const tabsHeader = document.createElement("div")
            tabsHeader.classList.add("tabs-header")
            this.tabs.forEach((tab, index) => {
                const button = document.createElement('button');
                button.textContent = tab.getAttribute('text');
                button.classList.add('tab-button');
                if (index === 0) {
                    button.classList.add('tab-active');
                    tab.classList.add('tab-active');
                }
                button.addEventListener('click', () => {
                    this.switchTab(index);
                });
                tabsHeader.appendChild(button);
                this.tabButtons.push(button);
            });
            this.appendChild(tabsHeader)
        })
    }
    switchTab(index) {
        this.tabs.forEach((tab, i) => {
            tab.classList.toggle('tab-active', i === index);
        });
        this.tabButtons.forEach((button, i) => {
            button.classList.toggle('tab-active', i === index);
        });
    }
}
class Menu extends HTMLElement {
    constructor(){
        super()
    }
    connectedCallback(){
        const eventoMouseEnter = new Event('mouseenter')
        this.addEventListener("mouseenter",()=>{
            if(this.parentElement!=null&&this.parentElement.tagName=="kl-submenu"){
                this.parentElement.style.display="block"
                this.style.display="block"
                this.parentElement.parentElement.dispatchEvent(eventoMouseEnter)
            }
        })
        this.addEventListener("mouseleave",()=>{
            if(this.parentElement!=null&&this.parentElement.tagName=="kl-submenu"){
                this.style.display="none"
                setTimeout(() => {
                    if(!this.parentElement.parentElement.mouse_inside){
                        this.parentElement.style.display="none"
                        this.style.display="none"
                    }
                }, 10)
            }
        })
        this.addEventListener("click",()=>{
            setTimeout(()=>{
                this.remove()
            },100)
        })
    }
    /**
     * 
     * @param {string} text 
     * @param {(event:MouseEvent)=>void} onclick 
     */
    add_option(text,onclick=(_e)=>{}){
        const node=document.createElement("kl-option")
        node.innerText=text
        node.addEventListener("click",onclick)
        this.appendChild(node)
    }
    /**
     * 
     * @param {string} text
     * @param {Menu} menu
     * @param {(event:MouseEvent)=>void} onclick
     */
    add_submenu(text,menu,onclick=(_e)=>{}){
        const node=document.createElement("kl-submenu")
        node.innerText=text
        node.addEventListener("click",onclick)
        node.appendChild(menu)
        this.appendChild(node)
    }
}
class SubMenu extends HTMLElement{
    constructor(){
        super()
        this.mouse_inside=false
        this.menu=null
    }
    connectedCallback(){
        this.addEventListener("mouseenter",()=>{
            this.menu=this.querySelector("kl-menu")
            this.mouse_inside=true
            this.menu.style.display="block"
        })
        this.addEventListener("mouseleave",()=>{
            this.mouse_inside=false
            this.menu.style.display="none"
        })
    }
}
class KLJoystick extends HTMLElement {
    constructor() {
        super();
        this.knob = document.createElement("div");
        this.knob.className = "knob";
        this.active = false;
        this.center = { x: 0, y: 0 };
        this.value = { x: 0, y: 0 };
        this.pointerId = null;
    }

    connectedCallback() {
        this.style.position = "relative";
        if (!this.contains(this.knob)) this.appendChild(this.knob);

        const start = (e) => {
            e.preventDefault();
            const isTouch = e.type === "touchstart";
            const point = isTouch ? e.changedTouches[0] : e;
            this.pointerId = isTouch ? point.identifier : point.pointerId ?? "mouse";

            const rect = this.getBoundingClientRect();
            this.center = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
            };
            this.active = true;
            move(e);

            document.addEventListener(isTouch ? "touchmove" : "pointermove", move, { passive: false });
            document.addEventListener(isTouch ? "touchend" : "pointerup", end);
        };

        const move = (e) => {
            if (!this.active) return;
            const isTouch = e.type === "touchmove";
            const points = isTouch ? e.changedTouches : [e];
            const point = [...points].find(p =>
                (isTouch ? p.identifier : p.pointerId ?? "mouse") === this.pointerId
            );
            if (!point) return;

            const dx = point.clientX - this.center.x;
            const dy = point.clientY - this.center.y;
            const max = this.offsetWidth / 2;
            const dist = Math.min(Math.sqrt(dx * dx + dy * dy), max);
            const angle = Math.atan2(dy, dx);
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;

            this.value.x = x / max;
            this.value.y = y / max;
            this.knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

            this.dispatchEvent(new CustomEvent("joystickmove", {
                detail: { x: this.value.x, y: this.value.y }
            }));
        };

        const end = (e) => {
            const isTouch = e.type === "touchend";
            const points = isTouch ? e.changedTouches : [e];
            const point = [...points].find(p =>
                (isTouch ? p.identifier : p.pointerId ?? "mouse") === this.pointerId
            );
            if (!point) return;

            this.active = false;
            this.pointerId = null;
            this.value = { x: 0, y: 0 };
            this.knob.style.transform = "translate(-50%, -50%)";
            this.dispatchEvent(new Event("joystickend"));

            document.removeEventListener(isTouch ? "touchmove" : "pointermove", move);
            document.removeEventListener(isTouch ? "touchend" : "pointerup", end);
        };

        this.addEventListener("touchstart", start, { passive: false });
        this.addEventListener("pointerdown", start);
        
        this.knob.style.position = "absolute";
        this.knob.style.top = "50%";
        this.knob.style.left = "50%";
        this.knob.style.transform = "translate(-50%, -50%)";
    }
}

customElements.define("kl-joystick", KLJoystick);
customElements.define('tabs-container', TabsContainer)
customElements.define("kl-menu", Menu)
customElements.define("kl-submenu", SubMenu)