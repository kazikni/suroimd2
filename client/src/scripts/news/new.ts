import { formatToHtml } from "../engine/utils.ts";

const newsS=document.querySelector("#about-sm-news") as HTMLDivElement

const news=[
    {
      title: "Pre-Beta-2",
      content:`
## News
___
### Mains
* **SNOW MAP!!** Mary Christmas
* Containers
* Christmas Tree
* A New Movimentation
* Snow Storm
* Ice
* Ice Slide
* Biome Musics
* Day And Night Cycle
___
### Menu
* Menu Music
* Loading Screen
* A Sound For Buttons Click
* Normal Mode Image Changed To A Gif
* A New Gif For Snow Mode
* Accounts Enabled For Test - PLEASE DONT USE YOUR REAL PASSWORD
* News Now Suport Markdown
___
### Items
* Yellow Laser Pistol: A Weapon Madded To Test Reflections
* Red Soda: A Alternative For Small Red Crystal
* M9 Sounds
* M9 Placeholder Graphics
* Green Soda And Green Bless
* Black Soda And Death
* Medikit Sfx
* Bandage Sfx
* Pills Sfx
___
### Others
* New Snow Musics
___
## Changes
___
### Items
* Quickswitch Improvement
* Survival Knife Attack Delay Come From 0.2s To 0.4s
* Bandage Now Healing Come From 15 To 20
* Soda Become Yellow Soda
* Small Blue Potion Become Blue Soda
* Small Purple Potion Become Purple Soda
* Small Red Crystal Just Heal Until 50%
___
### Others
* Readd Rivers
* Some Musics Change The Biome
___
## Fixes
* Rect Hitbox Damage
      `
    },
    {
      title: "Pre-Beta",
      content:`
<h2>News</h2>
<hr>
<h3>Mains</h3>
<ul>
<li><strong>DeadZone!!!!!</strong></li>
<li><strong>Emotes!!</strong></li>
<li><strong>Gameplay Musics!</strong></li>
<li><strong>ThunderStorm!</strong></li>
<li>Kill Leader Sounds</li>
<li>Tab. Why Have A Tab In 2000?</li>
<li>Badges</li>
<li>Loot Sounds And Gui</li>
<li>Alternative Vehicles Control</li>
<li>Translations</li> 
</ul>
<hr>
<h3>Menu</h3>
<ul>
<li>Debug Menu (Press Delete Or R3 To Access)</li>
<li>Fps Analizer</li>
<li>Crosshair</li>
<li>Alice Winner Skin</li>
<li>A New Background Art</li>
</ul>
<hr>
<h3>Items</h3>
<ul>
<li>Explosive Ammo - A New Ammo</li>
<li>Gasoline - A New Ammo And Liquid</li>
<li>RPG-7 - A Rocket Launcher When use Explosive Ammo</li>
<li>M2-2 - A Flamethrower</li>
<li>Projectiles Return</li>
<li>Projectiles Throw And Hold</li>
<li>Vests Icon</li>
<li>Vests Visual In Game</li>
</ul>
<hr>
<h3>Keys And Controls</h3>
<ul>
<li>Swamp Guns Slot (Use F)</li>
</ul>
<hr>
<h2>Changes</h2>
<hr>
<h3>Items</h3>
<ul>
<li>Survival Knife Animation</li>
<li>Survival Knife Redesign</li>
<li>Famas - 556mm Epic Gun. The First Burst Gun</li>
<li>Hammer Redesign</li>
<li>Axe Redesign</li>
<li>Swing Melee Animation</li>
<li>Melee Loot View</li>
<li>Melees On Loot Table</li>
</ul>
<hr>
<h3>Others<h3>
<ul>
<li><strong>Web Workers!!</strong> Now The Game Run 2 times faster in campaing mode</li>
<li>Bots Now Start With Items</li>
<li>Remove Expanded Inventory</li>
<li>A Redesign In Almost Everthing</li>
</ul>
<hr>
<h3>Fixes</h3>
<ul>
<li><strong>GIANT OPTIMISATION!!!</strong> No More Lag</li>
<li><strong>REQUEST ANIMATION FRAME!</strong></li>
<li>Triangulation On Terrain</li>
</ul>
`
    },
    {
      title:"Alpha 1.4",
      content:`
<h2>News</h2>
<hr>
<h3>Mains</h3>
<ul>
<li>Mobile And Control Aim Assist</li>
<li>Mounth Animations</li>
<li>Nick Winner(A Skin Gived If You Complete The Campaing Level 1. And Will Be The Skin Of The Campaing Level 1)</li>
<li>Mobile Now Autofire</li>
</ul>
<hr>
<h3>Menu</h3>
<ul>
<li>Rules</li>
<li>Ilumation No/Just Brightness/All Option</li>
<li>Climate On/Off Option</li>
<li>Ping Emulation Option</li>
<li>Client Interpolation Option</li>
<li>Client Side Rotation Option</li>
</ul>
<hr>
<h2>Changes</h2>
<hr>
<h3>Player</h3>
<ul>
<li>Human Skins Now Have Diferent Eyes</li>
</ul>
<hr>
<h3>Obstacles</h3>
<ul>
<li>Dead Tree Rework</li>
<li>Stone Rework And Broken Variation<h3>Others</h3>
</li>
<li>Some Optimisations</li>
</ul>
<hr>
<h2>Fixes</h2>
<hr>
<h3>Weapons</h3>
<ul>
<li>Dual Guns Pickup</li>
</ul>
<hr>
<h3>Controls</h3>
<ul>
<li>Mouse And Keyboard Keys<h1>Play The Game</h1>
</ul>      
`
    },
    {
      "title":"Alpha 1.3.1",
      content:`
<h2>News</h2>
<hr>
<h3>Main</h3>
<ul>
<li><strong>New Menu!</strong></li>
</ul>
<hr>
<h2>Fixes</h2>
<ul>
<li>Ammo Bug</li>
</ul>
      `
    },
    {
      "title":"Alpha 1.3.0",
      content:`
<h2>News</h2>
<hr>
<h3>Main</h3>
<ul>
<li><strong>Map!</strong></li>
<li><strong>Dynamic Lights</strong></li>
<li>Opitional Friendly Fire</li>
<li>Planes</li>
<li>Battle Plane</li>
<li>Gores</li>
</ul>
<hr>
<h3>Creatures</h3>
<ul>
<li>Chicken (Chicken Jockey)</li>
<li>Bots Simple AI(I Want Put A Tree After)</li>
</ul>
<hr>
<h3>Weapons</h3>
<ul>
<li><strong>DUAL WEAPONS/PISTOL!</strong></li>
<li>Pfeifer Zelikas - 308Sub revolver (banned in 40 countrys)</li>
<li>M9 - 9MM Pistol(Classic And Mayble Stopable)</li>
<li>M870 World Image</li>
</ul>
<hr>
<h3>Items</h3>
<ul>
<li>Consumibles Sounds</li>
<li>Consumibles Animation</li>
<li>Consumibles Particles</li>
</ul>
<hr>
<h3>Graphics</h3>
<ul>
<li>Vignetting</li>
<li>Rain</li>
<li>Tilt Shift</li>
<li>Color Adjust<h2>Changes</h2>
</li>
</ul>
<hr>
<h3>Main</h3>
<ul>
<li>Movement Is Now By Axis</li>
<li>10 Ping Emulation</li>
</ul>
<hr>
<h2>Fixes</h2>
<ul>
<li>Barrel Smoke</li>
<li>Keys</li>
<li>Addiction Damage</li>
<li>Parachute</li>
</ul>
<hr>
<ul>
<li>Game Over</li>
<li>Settings<h1>Play The Game</h1>
</ul>
      `,
    },
    {
      "title":"Alpha 1.2.0",
      content:`
<h2>News</h2>
<hr>
<h3>Main</h3>
<ul>
<li>Forum</li>
<li>Users View</li>
</ul>
<hr>
<h2>Fixes</h2>
<hr>
<ul>
<li>Game Over</li>
<li>Settings</li>
</ul>
      `
    },
    {
      "title":"Alpha 1.1.0",
      "content":`
<h2>News</h2>
<hr>
<h3>Mains</h3>
<ul>
<li>Player Graphics</li>
<li>Settings</li>
<li>Spritesheets</li>
<li>2D Sounds</li>
<li>Guns Sounds And Animations</li>
<li>Unfineshed Mobile Suport</li>
<li>Keybinds</li>
<li>Control Support</li>
<li>Terrain</li>
<li>Offline Version</li>
<li>Creatures And Animals</li>
<li>Bots</li>
<li>Vehicles</li>
<li>Golang API</li>
<li>Unfineshed Accounts System</li>
<li>Killleader</li>
<li>Killfeed</li>
<li>Expanded Inventory</li>
</ul>
<hr>
<h3>Obstacles</h3>
<ul>
<li>Crate</li>
<li>Obstacles Residues</li>
</ul>
<hr>
<h3>Guns</h3>
<ul>
<li>AR15 - 556mm Automatic</li>
<li>MP5 - 9mm Automatic</li>
<li>Uzi - 9mm Automatic</li>
<li>Bullet Image</li>
</ul>
<hr>
<h3">Player</h3>
<ul>
<li>Skins And Animations</li>
<li>Shield Break Animation</li>
</ul>
<hr>
<h3>Melees</h3>
<ul>
<li>Survival Knife</li>
</ul>
<hr>
<h3>Eastereggs</h3>
<ul>
<li>Squid Game Easteregg</li>
<li>You Died Easteregg</li>
</ul>
<hr>
<h3>Others</h3>
<ul>
<li>Explosions Sprite</li>
<li>Loot Physics</li>
</ul>
<hr>
<h2>Changes</h2>
<hr>
<ul>
<li>Particles Sprites</li>
<li>Vector Redesign</li>
<li>Collisions And Physics</li>
<li>Inventory System</li>
<li>Renderer</li>
</ul>
<hr>
<h3>Others</h3>
<ul>
<li>Bullet Through Obstacles</li>
<li>Loot Tables</li>
</ul>
<hr>
      `
    },
    {
        "title":"Alpha 1.0.0",
        "content":
`<h2>News</h2>
<h3> Guns</h3>
  * <b>Vector</b> - 9mm. Automatic<br>
  * <b>Awp</b> Design<br>
  * <b>Awms</b> Design<br>
<h3> Others</h3>
  * Damage Texts<br>
  * Critical Hits<br>
  * Game Over Gui<br>
<h2> Changes</h2>
<h3> Consumibles</h3>
<h5> Healings</h5>
   * </b>Medikit</b> Redesign<br>
   * </b>Gauze</b> Redesign<br>
   * </b>Lifecandy</b> Redesign<br>
<h5> Shield</h5>
  * <b>Blue Potion</b> Redesign<br>
  * <b>Small Blue Potion</b> Redesign<br>
<h5> Mana</h5>
  * <b>Purple Potion</b> Redesign<br>
  * <b>Small Purple Potion</b> Redesign<br>
<h5> Adrenaline</h5>
   * <b>Soda</b> Redesign<br>
   * <b>Inhaler</b> Redesign<br>
<h3>  Ammos</h5>
  * <b>762mm</b> Redesign<br>
  * <b>556mm</b> Redesign<br>
  * <b>9mm</b> Redesign<br>
  * <b>22lr</b> Redesign<br>
  * <b>12g</b> Redesign<br>
  * <b>308 Subsonic</b> Redesign<br>
  * <b>40mm</b> Redesign<br>
  * <b>50cal</b> Redesign<br>
<h3> Others</h3>
* <b>Ground Color</b> Changed`
    },
    {
        "title":"Pre-Alpha 1.0.0",
        "content":"<h3>The Game Is Alive</h3>"
    }
]

for(const n of news){
    const d=document.createElement("div")
    d.classList.add("update-item")
    d.innerHTML=`<h2>${n.title}</h2>`+formatToHtml(n.content)
    newsS.appendChild(d)
}