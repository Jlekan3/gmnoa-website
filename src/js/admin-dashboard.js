/* ==========================================================
   SUPABASE
========================================================== */

const SUPABASE_URL =
    "https://lnctolzzigpsjsvhtxwe.supabase.co";


const SUPABASE_ANON_KEY =
    "sb_publishable_O_JT8-AD_heentaVPRdXEQ_x9zCoDtt";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

// IMPORTANT: The dashboard uses only the public Supabase Storage bucket
// named "gmnoa-images" for every uploaded website image.


/* ==========================================================
   STORAGE BUCKETS
========================================================== */

const STORAGE_BUCKET = "gmnoa-images";

// All website images are stored in this ONE Supabase Storage bucket.
// Folders are used only to keep the bucket organized.
const STORAGE_FOLDERS = {
    blog: "blogs",
    event: "events",
    leader: "leaders"
};

const ALLOWED_STORAGE_FOLDERS =
    Object.values(STORAGE_FOLDERS);


const IMAGE_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg"
};


const DASHBOARD_ROLES = [
    "super_admin",
    "admin",
    "editor"
];


/* ==========================================================
   STATE
========================================================== */

let currentUser = null;

let currentProfile = null;

let blogPosts = [];

let events = [];

let leaders = [];

let contactMessages = [];

let editingBlogId = null;

let editingEventId = null;

let editingLeaderId = null;


/* ==========================================================
   INIT
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        lucide.createIcons();

        setupNavigation();

        setupForms();

        setupSearch();

        setupButtons();

        setupImagePreviews();

        await checkAuthentication();

    }
);


/* ==========================================================
   AUTH
========================================================== */

async function checkAuthentication() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .auth
                .getSession();


        if (error) {
            throw error;
        }


        if (!data.session) {

            window.location.href =
                "admin-login.html";

            return;

        }


        currentUser =
            data.session.user;


        currentProfile =
            await loadCurrentProfile();


        if (
            !DASHBOARD_ROLES.includes(
                currentProfile.role
            )
        ) {

            await supabaseClient
                .auth
                .signOut();

            window.location.href =
                "admin-login.html";

            return;

        }


        updateUserInterface();

        await loadEverything();

    }

    catch (error) {

        console.error(error);

        showToast(
            "Authentication error.",
            "error"
        );

    }

}


async function loadCurrentProfile() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "profiles"
            )
            .select(
                "id, full_name, email, role, avatar_url"
            )
            .eq(
                "id",
                currentUser.id
            )
            .single();


    if (error) {
        throw error;
    }


    return data;

}


/* ==========================================================
   USER
========================================================== */

function updateUserInterface() {

    if (!currentUser) {
        return;
    }


    const email =
        currentUser.email ||
        "Administrator";


    const name =
        currentProfile
            ?.full_name ||
        currentUser
            .user_metadata
            ?.name ||
        "Administrator";


    document.getElementById(
        "userName"
    ).textContent =
        name;


    document.getElementById(
        "userEmail"
    ).textContent =
        email;


    document.getElementById(
        "settingsEmail"
    ).value =
        email;


    document.getElementById(
        "userAvatar"
    ).textContent =
        name
            .charAt(0)
            .toUpperCase();

}


/* ==========================================================
   LOAD EVERYTHING
========================================================== */

async function loadEverything() {

    await Promise.all([

        loadBlogPosts(),

        loadEvents(),

        loadLeaders(),

        loadContactMessages(),

        loadWebsiteSettings()

    ]);


    updateStatistics();

    renderDashboardEvents();

    updateDatabaseStatus();

}


/* ==========================================================
   BLOG
========================================================== */

async function loadBlogPosts() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("blog_posts")
                .select(
                    "*, profiles:author_id(full_name, email)"
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                );


        if (error) {

            console.warn(
                "Blog:",
                error.message
            );

            blogPosts = [];

            renderBlogTable();

            return;

        }


            blogPosts =
                await Promise.all(
                    (data || []).map(
                        resolveBlogPostImage
                    )
                );


        renderBlogTable();

    }

    catch (error) {

        console.error(error);

        blogPosts = [];

        renderBlogTable();

    }

}


function renderBlogTable(
    search = ""
) {

    const container =
        document.getElementById(
            "blogTable"
        );


    const filtered =
        blogPosts.filter(
            post => {

                const text =
                    `${post.title || ""} ${post.content || ""} ${post.excerpt || ""} ${blogAuthorName(post)}`
                        .toLowerCase();


                return text.includes(
                    search.toLowerCase()
                );

            }
        );


    if (!filtered.length) {

        container.innerHTML = `

            <div class="empty">

                <i data-lucide="newspaper"></i>

                <h4>
                    No blog posts
                </h4>

                <p>
                    Create your first article.
                </p>

            </div>

        `;

        lucide.createIcons();

        return;

    }


    container.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>
                        Image
                    </th>

                    <th>
                        Title
                    </th>

                    <th>
                        Author
                    </th>

                    <th>
                        Status
                    </th>

                    <th>
                        Date
                    </th>

                    <th>
                        Actions
                    </th>

                </tr>

            </thead>


            <tbody>

                ${filtered.map(
                    post => `

                    <tr>

                        <td>

                            ${
                                blogImageUrl(post)
                                ?

                                `<img
                                    class="image-thumb"
                                    src="${escapeHTML(blogImageUrl(post))}"
                                    alt=""
                                >`

                                :

                                `<div class="image-thumb"></div>`
                            }

                        </td>


                        <td>

                            <div class="table-title">

                                ${escapeHTML(
                                    post.title ||
                                    "Untitled"
                                )}

                            </div>

                        </td>


                        <td>

                            ${escapeHTML(
                                blogAuthorName(post) ||
                                "â€”"
                            )}

                        </td>


                        <td>

                            <span
                                class="status ${statusClass(
                                    post.status,
                                    "draft"
                                )}"
                            >

                                ${escapeHTML(
                                    post.status ||
                                    "draft"
                                )}

                            </span>

                        </td>


                        <td>

                            ${formatDate(
                                post.created_at
                            )}

                        </td>


                        <td>

                            <div class="actions">

                                <button
                                    class="btn btn-secondary btn-sm"
                                    onclick="editBlog('${inlineHandlerArg(post.id)}')"
                                >

                                    <i data-lucide="pencil"></i>

                                </button>


                                <button
                                    class="btn btn-danger btn-sm"
                                    onclick="deleteBlog('${inlineHandlerArg(post.id)}')"
                                >

                                    <i data-lucide="trash-2"></i>

                                </button>

                            </div>

                        </td>

                    </tr>

                `
                ).join("")}

            </tbody>

        </table>

    `;


    lucide.createIcons();

}


/* ==========================================================
   BLOG MODAL
========================================================== */

function openBlogModal(
    id = null
) {

    editingBlogId =
        normalizeRecordId(id);


    document.getElementById(
        "blogForm"
    ).reset();


    document.getElementById(
        "blogImagePreviewContainer"
    ).style.display =
        "none";


    if (editingBlogId) {

        const post =
            blogPosts.find(
                item =>
                    item.id ===
                    editingBlogId
            );


        if (!post) {
            return;
        }


        document.getElementById(
            "blogModalTitle"
        ).textContent =
            "Edit Blog Post";


        document.getElementById(
            "blogTitle"
        ).value =
            post.title || "";


        document.getElementById(
            "blogAuthor"
        ).value =
            blogAuthorName(post) ||
            "";


        document.getElementById(
            "blogStatus"
        ).value =
            post.status ||
            "draft";


        document.getElementById(
            "blogContent"
        ).value =
            post.content ||
            "";


        if (blogImageUrl(post)) {

            document.getElementById(
                "blogImagePreview"
            ).src =
                blogImageUrl(post);


            document.getElementById(
                "blogImagePreviewContainer"
            ).style.display =
                "block";

        }

    }

    else {

        document.getElementById(
            "blogModalTitle"
        ).textContent =
            "Create Blog Post";


        document.getElementById(
            "blogAuthor"
        ).value =
            currentProfile?.full_name ||
            currentUser?.email ||
            "";

    }


    document.getElementById(
        "blogModal"
    ).classList.add(
        "open"
    );

}


async function saveBlog(
    event
) {

    event.preventDefault();


    try {

        const title =
            document.getElementById(
                "blogTitle"
            ).value.trim();


        const status =
            document.getElementById(
                "blogStatus"
            ).value;


        const content =
            document.getElementById(
                "blogContent"
            ).value.trim();


        const file =
            document.getElementById(
                "blogImage"
            ).files[0];


        let imageUrl =
            null;


        if (
            editingBlogId
        ) {

            const old =
                blogPosts.find(
                    post =>
                        post.id ===
                        editingBlogId
                );


            imageUrl =
                blogImageUrl(old) ||
                null;

        }


        if (file) {

            imageUrl =
                await uploadImage(
                    file,
                    STORAGE_FOLDERS.blog
                );

        }


        const payload = {

            title,

            slug:
                slugify(title),

            status,

            content,

            excerpt:
                content.slice(
                    0,
                    180
                ),

            featured_image_url:
                imageUrl,

            author_id:
                currentUser?.id ||
                null,

            published_at:
                status === "published"
                    ? new Date()
                        .toISOString()
                    : null

        };


        let result;


        if (editingBlogId) {

            result =
                await supabaseClient
                    .from(
                        "blog_posts"
                    )
                    .update(
                        payload
                    )
                    .eq(
                        "id",
                        requireRecordId(editingBlogId)
                    );

        }

        else {

            result =
                await supabaseClient
                    .from(
                        "blog_posts"
                    )
                    .insert([
                        payload
                    ]);

        }


        if (result.error) {
            throw result.error;
        }


        await logAudit(
            "blog_posts",
            editingBlogId,
            editingBlogId
                ? "update"
                : "insert",
            {
                title,
                status
            }
        );


        closeModal(
            "blogModal"
        );


        showToast(
            editingBlogId
                ?
                "Blog post updated."
                :
                "Blog post created.",
            "success"
        );


        await loadBlogPosts();

        updateStatistics();

    }

    catch (error) {

        console.error(error);

        showToast(
            error.message,
            "error"
        );

    }

}


function editBlog(id) {

    openBlogModal(id);

}


async function deleteBlog(
    id
) {

    const recordId =
        requireRecordId(id);


    if (
        !confirm(
            "Delete this blog post?"
        )
    ) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from(
                    "blog_posts"
                )
                .delete()
                .eq(
                    "id",
                    recordId
                );


        if (error) {
            throw error;
        }


        await logAudit(
            "blog_posts",
            recordId,
            "delete"
        );


        showToast(
            "Blog post deleted.",
            "success"
        );


        await loadBlogPosts();

        updateStatistics();

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


/* ==========================================================
   EVENTS
========================================================== */

async function loadEvents() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "events"
                )
                .select("*")
                .order(
                    "event_date",
                    {
                        ascending:
                            false
                    }
                );


        if (error) {
            throw error;
        }


        events =
            await Promise.all(
                (data || []).map(
                    resolveEventImage
                )
            );


        renderEventsTable();

    }

    catch (error) {

        console.error(error);

        events = [];

        renderEventsTable();

    }

}


function renderEventsTable(
    search = ""
) {

    const container =
        document.getElementById(
            "eventsTable"
        );


    const filtered =
        events.filter(
            event => {

                const text =
                    `${event.title || ""} ${event.location || ""}`
                        .toLowerCase();


                return text.includes(
                    search.toLowerCase()
                );

            }
        );


    if (!filtered.length) {

        container.innerHTML = `

            <div class="empty">

                <i data-lucide="calendar"></i>

                <h4>
                    No events
                </h4>

                <p>
                    Add your first event.
                </p>

            </div>

        `;

        lucide.createIcons();

        return;

    }


    container.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>
                        Image
                    </th>

                    <th>
                        Event
                    </th>

                    <th>
                        Date
                    </th>

                    <th>
                        Location
                    </th>

                    <th>
                        Status
                    </th>

                    <th>
                        Actions
                    </th>

                </tr>

            </thead>


            <tbody>

                ${filtered.map(
                    event => `

                    <tr>

                        <td>

                            ${
                                eventImageUrl(event)

                                ?

                                `<img
                                    class="image-thumb"
                                    src="${escapeHTML(eventImageUrl(event))}"
                                    alt=""
                                >`

                                :

                                `<div class="image-thumb"></div>`
                            }

                        </td>


                        <td>

                            <div class="table-title">

                                ${escapeHTML(
                                    event.title ||
                                    "Untitled"
                                )}

                            </div>

                        </td>


                        <td>

                            ${formatDate(
                                event.event_date
                            )}

                        </td>


                        <td>

                            ${escapeHTML(
                                event.location ||
                                "â€”"
                            )}

                        </td>


                        <td>

                            <span
                                class="status ${statusClass(
                                    event.status,
                                    "upcoming"
                                )}"
                            >

                                ${escapeHTML(
                                    event.status ||
                                    "upcoming"
                                )}

                            </span>

                        </td>


                        <td>

                            <div class="actions">

                                <button
                                    class="btn btn-secondary btn-sm"
                                    onclick="editEvent('${inlineHandlerArg(event.id)}')"
                                >

                                    <i data-lucide="pencil"></i>

                                </button>


                                <button
                                    class="btn btn-danger btn-sm"
                                    onclick="deleteEvent('${inlineHandlerArg(event.id)}')"
                                >

                                    <i data-lucide="trash-2"></i>

                                </button>

                            </div>

                        </td>

                    </tr>

                `
                ).join("")}

            </tbody>

        </table>

    `;


    lucide.createIcons();

}


function openEventModal(
    id = null
) {

    editingEventId =
        normalizeRecordId(id);


    document.getElementById(
        "eventForm"
    ).reset();


    document.getElementById(
        "eventImagePreviewContainer"
    ).style.display =
        "none";


    if (editingEventId) {

        const event =
            events.find(
                item =>
                    item.id ===
                    editingEventId
            );


        if (!event) {
            return;
        }


        document.getElementById(
            "eventModalTitle"
        ).textContent =
            "Edit Event";


        document.getElementById(
            "eventTitle"
        ).value =
            event.title ||
            "";


        document.getElementById(
            "eventDate"
        ).value =
            toDateTimeLocal(
                event.event_date
            );


        document.getElementById(
            "eventEndDate"
        ).value =
            toDateTimeLocal(
                event.end_date
            );


        document.getElementById(
            "eventLocation"
        ).value =
            event.location ||
            "";


        document.getElementById(
            "eventRegistration"
        ).value =
            event.registration_link ||
            "";


        document.getElementById(
            "eventStatus"
        ).value =
            event.status ||
            "upcoming";


        document.getElementById(
            "eventDescription"
        ).value =
            event.description ||
            event.content ||
            "";


        if (
            eventImageUrl(event)
        ) {

            document.getElementById(
                "eventImagePreview"
            ).src =
                eventImageUrl(event);


            document.getElementById(
                "eventImagePreviewContainer"
            ).style.display =
                "block";

        }

    }

    else {

        document.getElementById(
            "eventModalTitle"
        ).textContent =
            "Create Event";

    }


    document.getElementById(
        "eventModal"
    ).classList.add(
        "open"
    );

}


async function saveEvent(
    event
) {

    event.preventDefault();


    try {

        const file =
            document.getElementById(
                "eventImage"
            ).files[0];


        let imageUrl =
            null;


        if (
            editingEventId
        ) {

            const old =
                events.find(
                    item =>
                        item.id ===
                        editingEventId
                );


            imageUrl =
                old?.image_url ||
                null;

        }


        if (file) {

            imageUrl =
                await uploadImage(
                    file,
                    STORAGE_FOLDERS.event
                );

        }


        const payload = {

            title:
                document.getElementById(
                    "eventTitle"
                ).value.trim(),

            event_date:
                document.getElementById(
                    "eventDate"
                ).value ||
                null,

            end_date:
                document.getElementById(
                    "eventEndDate"
                ).value ||
                null,

            location:
                document.getElementById(
                    "eventLocation"
                ).value.trim(),

            image_url:
                imageUrl,

            registration_link:
                document.getElementById(
                    "eventRegistration"
                ).value.trim(),

            status:
                document.getElementById(
                    "eventStatus"
                ).value,

            description:
                document.getElementById(
                    "eventDescription"
                ).value.trim()

        };


        if (!editingEventId) {

            payload.created_by =
                currentUser?.id ||
                null;

        }


        let result;


        if (editingEventId) {

            result =
                await supabaseClient
                    .from(
                        "events"
                    )
                    .update(
                        payload
                    )
                    .eq(
                        "id",
                        requireRecordId(editingEventId)
                    );

        }

        else {

            result =
                await supabaseClient
                    .from(
                        "events"
                    )
                    .insert([
                        payload
                    ]);

        }


        if (result.error) {
            throw result.error;
        }


        await logAudit(
            "events",
            editingEventId,
            editingEventId
                ? "update"
                : "insert",
            {
                title:
                    payload.title,
                status:
                    payload.status
            }
        );


        closeModal(
            "eventModal"
        );


        showToast(
            editingEventId
                ?
                "Event updated."
                :
                "Event created.",
            "success"
        );


        await loadEvents();

        updateStatistics();

        renderDashboardEvents();

    }

    catch (error) {

        console.error(error);

        showToast(
            error.message,
            "error"
        );

    }

}


function editEvent(id) {

    openEventModal(id);

}


async function deleteEvent(
    id
) {

    const recordId =
        requireRecordId(id);


    if (
        !confirm(
            "Delete this event?"
        )
    ) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from(
                    "events"
                )
                .delete()
                .eq(
                    "id",
                    recordId
                );


        if (error) {
            throw error;
        }


        await logAudit(
            "events",
            recordId,
            "delete"
        );


        showToast(
            "Event deleted.",
            "success"
        );


        await loadEvents();

        updateStatistics();

        renderDashboardEvents();

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


/* ==========================================================
   LEADERS
========================================================== */

async function loadLeaders() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "team_members"
                )
                .select("*")
                .order(
                    "display_order",
                    {
                        ascending:
                            true,
                        nullsFirst:
                            false
                    }
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                );


        if (error) {

            console.warn(
                "Leaders:",
                error.message
            );

            leaders = [];

            renderLeadersTable();

            return;

        }


        leaders =
            await Promise.all(
                (data || []).map(
                    resolveLeaderImage
                )
            );


        renderLeadersTable();

    }

    catch (error) {

        console.error(error);

        leaders = [];

        renderLeadersTable();

    }

}


function renderLeadersTable(
    search = ""
) {

    const container =
        document.getElementById(
            "leadersTable"
        );


    const filtered =
        orderedLeaders(
            leaders
        ).filter(
            leader => {

                const text =
                    `${leader.full_name || ""} ${leader.position || ""} ${leader.email || ""}`
                        .toLowerCase();


                return text.includes(
                    search.toLowerCase()
                );

            }
        );


    if (!filtered.length) {

        container.innerHTML = `

            <div class="empty">

                <i data-lucide="users"></i>

                <h4>
                    No leaders
                </h4>

                <p>
                    Add your first leader.
                </p>

            </div>

        `;

        lucide.createIcons();

        return;

    }


    container.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>
                        Photo
                    </th>

                    <th>
                        Name
                    </th>

                    <th>
                        Position
                    </th>

                    <th>
                        Order
                    </th>

                    <th>
                        Email
                    </th>

                    <th>
                        Status
                    </th>

                    <th>
                        Actions
                    </th>

                </tr>

            </thead>


            <tbody>

                ${filtered.map(
                    leader => `

                    <tr>

                        <td>

                            ${
                                leaderImageUrl(leader)

                                ?

                                `<img
                                    class="leader-thumb"
                                    src="${escapeHTML(
                                        leaderImageUrl(leader)
                                    )}"
                                    alt=""
                                >`

                                :

                                `<div class="leader-thumb"></div>`
                            }

                        </td>


                        <td>

                            <div class="table-title">

                                ${escapeHTML(
                                    leader.full_name ||
                                    "Unnamed"
                                )}

                            </div>

                        </td>


                        <td>

                            <div class="order-controls">

                                <span class="order-number">
                                    ${escapeHTML(
                                        leader.display_order ||
                                        "â€”"
                                    )}
                                </span>

                                <button
                                    class="btn btn-secondary btn-sm"
                                    type="button"
                                    title="Move up"
                                    aria-label="Move ${escapeHTML(leader.full_name || "leader")} up"
                                    onclick="moveLeader('${inlineHandlerArg(leader.id)}', 'up')"
                                >
                                    <i data-lucide="arrow-up"></i>
                                </button>

                                <button
                                    class="btn btn-secondary btn-sm"
                                    type="button"
                                    title="Move down"
                                    aria-label="Move ${escapeHTML(leader.full_name || "leader")} down"
                                    onclick="moveLeader('${inlineHandlerArg(leader.id)}', 'down')"
                                >
                                    <i data-lucide="arrow-down"></i>
                                </button>

                            </div>

                        </td>


                        <td>

                            ${escapeHTML(
                                leader.position ||
                                "â€”"
                            )}

                        </td>


                        <td>

                            ${escapeHTML(
                                leader.email ||
                                "â€”"
                            )}

                        </td>


                        <td>

                            <span
                                class="status ${statusClass(
                                    leaderStatusValue(leader),
                                    "active"
                                )}"
                            >

                                ${escapeHTML(
                                    leaderStatusLabel(leader)
                                )}

                            </span>

                        </td>


                        <td>

                            <div class="actions">

                                <button
                                    class="btn btn-secondary btn-sm"
                                    onclick="editLeader('${inlineHandlerArg(leader.id)}')"
                                >

                                    <i data-lucide="pencil"></i>

                                </button>


                                <button
                                    class="btn btn-danger btn-sm"
                                    onclick="deleteLeader('${inlineHandlerArg(leader.id)}')"
                                >

                                    <i data-lucide="trash-2"></i>

                                </button>

                            </div>

                        </td>

                    </tr>

                `
                ).join("")}

            </tbody>

        </table>

    `;


    lucide.createIcons();

}


function openLeaderModal(
    id = null
) {

    editingLeaderId =
        normalizeRecordId(id);


    document.getElementById(
        "leaderForm"
    ).reset();


    document.getElementById(
        "leaderImagePreviewContainer"
    ).style.display =
        "none";


    if (editingLeaderId) {

        const leader =
            leaders.find(
                item =>
                    item.id ===
                    editingLeaderId
            );


        if (!leader) {
            return;
        }


        document.getElementById(
            "leaderModalTitle"
        ).textContent =
            "Edit Leader";


        document.getElementById(
            "leaderName"
        ).value =
            leader.full_name ||
            "";


        document.getElementById(
            "leaderPosition"
        ).value =
            leader.position ||
            "";


        document.getElementById(
            "leaderEmail"
        ).value =
            leader.email ||
            "";


        document.getElementById(
            "leaderPhone"
        ).value =
            leader.phone ||
            "";


        document.getElementById(
            "leaderStatus"
        ).value =
            leaderStatusValue(leader);


        document.getElementById(
            "leaderDisplayOrder"
        ).value =
            leader.display_order ||
            "";


        if (
            leaderImageUrl(leader)
        ) {

            document.getElementById(
                "leaderImagePreview"
            ).src =
                leaderImageUrl(leader);


            document.getElementById(
                "leaderImagePreviewContainer"
            ).style.display =
                "block";

        }

    }

    else {

        document.getElementById(
            "leaderModalTitle"
        ).textContent =
            "Add Leader";


        document.getElementById(
            "leaderDisplayOrder"
        ).value =
            nextLeaderDisplayOrder();

    }


    document.getElementById(
        "leaderModal"
    ).classList.add(
        "open"
    );

}


async function saveLeader(
    event
) {

    event.preventDefault();


    try {

        const file =
            document.getElementById(
                "leaderImage"
            ).files[0];


        let imageUrl =
            null;


        if (
            editingLeaderId
        ) {

            const old =
                leaders.find(
                    item =>
                        item.id ===
                        editingLeaderId
                );


            imageUrl =
                old?.image_url ||
                null;

        }


        if (file) {

            imageUrl =
                await uploadImage(
                    file,
                    STORAGE_FOLDERS.leader
                );

        }


        const payload = {

            full_name:
                document.getElementById(
                    "leaderName"
                ).value.trim(),

            position:
                document.getElementById(
                    "leaderPosition"
                ).value.trim(),

            email:
                document.getElementById(
                    "leaderEmail"
                ).value.trim(),

            phone:
                document.getElementById(
                    "leaderPhone"
                ).value.trim(),

            is_active:
                document.getElementById(
                    "leaderStatus"
                ).value ===
                "active",

            display_order:
                normalizeDisplayOrder(
                    document.getElementById(
                        "leaderDisplayOrder"
                    ).value,
                    nextLeaderDisplayOrder()
                ),

            image_url:
                imageUrl

        };


        let result;


        if (editingLeaderId) {

            result =
                await supabaseClient
                    .from(
                        "team_members"
                    )
                    .update(
                        payload
                    )
                    .eq(
                        "id",
                        requireRecordId(editingLeaderId)
                    );

        }

        else {

            result =
                await supabaseClient
                    .from(
                        "team_members"
                    )
                    .insert([
                        payload
                    ]);

        }


        if (result.error) {
            throw result.error;
        }


        await logAudit(
            "team_members",
            editingLeaderId,
            editingLeaderId
                ? "update"
                : "insert",
            {
                full_name:
                    payload.full_name,
                is_active:
                    payload.is_active
            }
        );


        closeModal(
            "leaderModal"
        );


        showToast(
            editingLeaderId
                ?
                "Leader updated."
                :
                "Leader added.",
            "success"
        );


        await loadLeaders();

        updateStatistics();

    }

    catch (error) {

        console.error(error);

        showToast(
            error.message,
            "error"
        );

    }

}


async function moveLeader(
    id,
    direction
) {

    const recordId =
        requireRecordId(id);


    const currentOrder =
        orderedLeaders(
            leaders
        );


    const currentIndex =
        currentOrder.findIndex(
            leader =>
                leader.id ===
                recordId
        );


    if (currentIndex === -1) {
        return;
    }


    const targetIndex =
        direction === "up"
            ? currentIndex - 1
            : currentIndex + 1;


    if (
        targetIndex < 0 ||
        targetIndex >= currentOrder.length
    ) {
        return;
    }


    const reordered =
        [...currentOrder];

    const [moved] =
        reordered.splice(
            currentIndex,
            1
        );

    reordered.splice(
        targetIndex,
        0,
        moved
    );


    try {

        const updates =
            await Promise.all(
            reordered.map(
                (leader, index) =>
                    supabaseClient
                        .from(
                            "team_members"
                        )
                        .update({
                            display_order:
                                (index + 1) * 10
                        })
                        .eq(
                            "id",
                            requireRecordId(
                                leader.id
                            )
                        )
            )
        );


        const failedUpdate =
            updates.find(
                result =>
                    result.error
            );


        if (failedUpdate) {
            throw failedUpdate.error;
        }


        await logAudit(
            "team_members",
            recordId,
            "update",
            {
                display_order:
                    direction
            }
        );


        showToast(
            "Leader order updated.",
            "success"
        );


        await loadLeaders();

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


function editLeader(id) {

    openLeaderModal(id);

}


async function deleteLeader(
    id
) {

    const recordId =
        requireRecordId(id);


    if (
        !confirm(
            "Delete this leader?"
        )
    ) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from(
                    "team_members"
                )
                .delete()
                .eq(
                    "id",
                    recordId
                );


        if (error) {
            throw error;
        }


        await logAudit(
            "team_members",
            recordId,
            "delete"
        );


        showToast(
            "Leader deleted.",
            "success"
        );


        await loadLeaders();

        updateStatistics();

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


/* ==========================================================
   CONTACT MESSAGES
========================================================== */

async function loadContactMessages() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "contact_messages"
                )
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                );


        if (error) {
            throw error;
        }


        contactMessages =
            data || [];


        renderMessagesTable();

    }

    catch (error) {

        console.error(error);

        contactMessages = [];

        renderMessagesTable();

    }

}


function renderMessagesTable(
    search = ""
) {

    const container =
        document.getElementById(
            "messagesTable"
        );


    const filtered =
        contactMessages.filter(
            message => {

                const text =
                    `${message.full_name || ""} ${message.email || ""} ${message.subject || ""} ${message.message || ""}`
                        .toLowerCase();


                return text.includes(
                    search.toLowerCase()
                );

            }
        );


    if (!filtered.length) {

        container.innerHTML = `

            <div class="empty">

                <i data-lucide="inbox"></i>

                <h4>
                    No messages
                </h4>

                <p>
                    Contact form submissions will appear here.
                </p>

            </div>

        `;

        lucide.createIcons();

        return;

    }


    container.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>Sender</th>
                    <th>Subject</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>

                </tr>

            </thead>

            <tbody>

                ${filtered.map(
                    message => `

                    <tr>

                        <td>
                            <div class="table-title">
                                ${escapeHTML(message.full_name || "Unknown")}
                            </div>
                            <div class="table-muted">
                                ${escapeHTML(message.email || "â€”")}
                            </div>
                        </td>

                        <td>
                            ${escapeHTML(message.subject || "General enquiry")}
                        </td>

                        <td>
                            ${escapeHTML(trimText(message.message, 120))}
                        </td>

                        <td>
                            <span class="status ${statusClass(message.status, "unread")}">
                                ${escapeHTML(message.status || "unread")}
                            </span>
                        </td>

                        <td>
                            ${formatDate(message.created_at)}
                        </td>

                        <td>
                            <div class="actions">

                                <button
                                    class="btn btn-secondary btn-sm"
                                    onclick="updateMessageStatus('${inlineHandlerArg(message.id)}', 'read')"
                                >
                                    <i data-lucide="mail-open"></i>
                                </button>

                                <button
                                    class="btn btn-secondary btn-sm"
                                    onclick="updateMessageStatus('${inlineHandlerArg(message.id)}', 'archived')"
                                >
                                    <i data-lucide="archive"></i>
                                </button>

                                <button
                                    class="btn btn-danger btn-sm"
                                    onclick="deleteMessage('${inlineHandlerArg(message.id)}')"
                                >
                                    <i data-lucide="trash-2"></i>
                                </button>

                            </div>
                        </td>

                    </tr>

                `
                ).join("")}

            </tbody>

        </table>

    `;


    lucide.createIcons();

}


async function updateMessageStatus(
    id,
    status
) {

    const recordId =
        requireRecordId(id);


    try {

        const {
            error
        } =
            await supabaseClient
                .from(
                    "contact_messages"
                )
                .update(
                    {
                        status,
                        replied_at:
                            status === "replied"
                                ? new Date()
                                    .toISOString()
                                : null
                    }
                )
                .eq(
                    "id",
                    recordId
                );


        if (error) {
            throw error;
        }


        await logAudit(
            "contact_messages",
            recordId,
            "update_status",
            {
                status
            }
        );


        await loadContactMessages();

        showToast(
            "Message updated.",
            "success"
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


async function deleteMessage(
    id
) {

    const recordId =
        requireRecordId(id);


    if (
        !confirm(
            "Delete this message?"
        )
    ) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from(
                    "contact_messages"
                )
                .delete()
                .eq(
                    "id",
                    recordId
                );


        if (error) {
            throw error;
        }


        await logAudit(
            "contact_messages",
            recordId,
            "delete"
        );


        await loadContactMessages();

        showToast(
            "Message deleted.",
            "success"
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


/* ==========================================================
   IMAGE UPLOAD
========================================================== */

async function uploadImage(
    file,
    folder = "general"
) {

    if (!file) {
        return null;
    }


    const extension =
        IMAGE_EXTENSIONS[file.type];


    if (!extension) {

        throw new Error(
            "Please select a valid image file."
        );

    }


    const maxSize =
        10 * 1024 * 1024;


    if (
        file.size >
        maxSize
    ) {

        throw new Error(
            "Image must be smaller than 10MB."
        );

    }


    const safeFolder =
        ALLOWED_STORAGE_FOLDERS.includes(folder)
            ? folder
            : "general";


    const filename =
        `${Date.now()}-${crypto.randomUUID()}.${extension}`;


    const filePath =
        `${safeFolder}/${filename}`;


    const {
        error
    } =
        await supabaseClient
            .storage
            .from(STORAGE_BUCKET)
            .upload(
                filePath,
                file,
                {
                    cacheControl:
                        "3600",

                    upsert:
                        false
                }
            );


    if (error) {
        throw error;
    }


    const {
        data
    } =
        supabaseClient
            .storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(
                filePath
            );


    return data.publicUrl;

}


/* ==========================================================
   WEBSITE SETTINGS
========================================================== */

async function loadWebsiteSettings() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "site_settings"
                )
                .select("*");


        if (error) {

            console.warn(
                "Site settings:",
                error.message
            );

            return;

        }


        const settings =
            data || [];


        const mentorship =
            settings.find(
                item =>
                    item.setting_key ===
                    "mentorship_link"
            );


        const join =
            settings.find(
                item =>
                    item.setting_key ===
                    "join_us_link"
            );


        if (
            mentorship?.setting_value
        ) {

            document.getElementById(
                "mentorshipLink"
            ).value =
                mentorship.setting_value;


            document.getElementById(
                "currentMentorshipLink"
            ).textContent =
                mentorship.setting_value;

        }


        if (
            join?.setting_value
        ) {

            document.getElementById(
                "joinLink"
            ).value =
                join.setting_value;


            document.getElementById(
                "currentJoinLink"
            ).textContent =
                join.setting_value;

        }

    }

    catch (error) {

        console.error(error);

    }

}


/* ==========================================================
   SAVE WEBSITE SETTING
========================================================== */

async function saveSetting(
    key,
    value
) {

    const {
        error
    } =
        await supabaseClient
            .from(
                "site_settings"
            )
            .upsert(
                {
                    setting_key: key,
                    setting_value: value,
                    updated_by: currentUser?.id || null,
                    updated_at:
                        new Date()
                            .toISOString()
                },
                {
                    onConflict:
                        "setting_key"
                }
            )
            .select(
                "setting_key"
            )
            .single();


    if (error) {
        throw error;
    }


    await logAudit(
        "site_settings",
        key,
        "upsert",
        {
            setting_key:
                key
        }
    );

}


async function logAudit(
    tableName,
    recordId,
    action,
    metadata = {}
) {

    try {

        await supabaseClient
            .from(
                "audit_logs"
            )
            .insert([
                {
                    table_name:
                        tableName,
                    record_id:
                        recordId || null,
                    action,
                    metadata,
                    actor_id:
                        currentUser?.id ||
                        null
                }
            ]);

    }

    catch (error) {

        console.warn(
            "Audit log skipped:",
            error.message
        );

    }

}


/* ==========================================================
   MENTORSHIP
========================================================== */

async function saveMentorship() {

    try {

        const link =
            document.getElementById(
                "mentorshipLink"
            ).value.trim();


        if (!link) {

            showToast(
                "Enter the mentorship link.",
                "error"
            );

            return;

        }


        await saveSetting(
            "mentorship_link",
            link
        );


        document.getElementById(
            "currentMentorshipLink"
        ).textContent =
            link;


        showToast(
            "Mentorship link saved.",
            "success"
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


/* ==========================================================
   JOIN US
========================================================== */

async function saveJoinUs() {

    try {

        const link =
            document.getElementById(
                "joinLink"
            ).value.trim();


        if (!link) {

            showToast(
                "Enter the Join Us link.",
                "error"
            );

            return;

        }


        await saveSetting(
            "join_us_link",
            link
        );


        document.getElementById(
            "currentJoinLink"
        ).textContent =
            link;


        showToast(
            "Join Us link saved.",
            "success"
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


/* ==========================================================
   DASHBOARD
========================================================== */

function renderDashboardEvents() {

    const container =
        document.getElementById(
            "dashboardEvents"
        );


    const latest =
        events.slice(
            0,
            5
        );


    if (!latest.length) {

        container.innerHTML = `

            <div class="empty">

                <i data-lucide="calendar"></i>

                <h4>
                    No events yet
                </h4>

                <p>
                    Your latest events will appear here.
                </p>

            </div>

        `;

        lucide.createIcons();

        return;

    }


    container.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>
                        Event
                    </th>

                    <th>
                        Date
                    </th>

                    <th>
                        Status
                    </th>

                </tr>

            </thead>


            <tbody>

                ${latest.map(
                    event => `

                    <tr>

                        <td>

                            <div class="table-title">

                                ${escapeHTML(
                                    event.title ||
                                    "Untitled"
                                )}

                            </div>

                        </td>

                        <td>

                            ${formatDate(
                                event.event_date
                            )}

                        </td>

                        <td>

                            <span
                                class="status ${statusClass(
                                    event.status,
                                    "upcoming"
                                )}"
                            >

                                ${escapeHTML(
                                    event.status ||
                                    "upcoming"
                                )}

                            </span>

                        </td>

                    </tr>

                `
                ).join("")}

            </tbody>

        </table>

    `;


    lucide.createIcons();

}


/* ==========================================================
   STATS
========================================================== */

function updateStatistics() {

    document.getElementById(
        "statPosts"
    ).textContent =
        blogPosts.length;


    document.getElementById(
        "statEvents"
    ).textContent =
        events.length;


    document.getElementById(
        "statLeaders"
    ).textContent =
        leaders.length;

}


/* ==========================================================
   NAVIGATION
========================================================== */

function setupNavigation() {

    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        showSection(
                            button.dataset.section
                        );

                        closeMobileSidebar();

                    }
                );

            }
        );

}


function showSection(
    sectionName
) {

    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            item => {

                item.classList.toggle(
                    "active",
                    item.dataset.section ===
                    sectionName
                );

            }
        );


    document
        .querySelectorAll(
            ".section"
        )
        .forEach(
            section => {

                section.classList.toggle(
                    "active",
                    section.id ===
                    `section-${sectionName}`
                );

            }
        );


    const titles = {

        dashboard:
            "Dashboard",

        blog:
            "Blog",

        events:
            "Events",

        leaders:
            "Leaders",

        messages:
            "Inbox",

        mentorship:
            "Mentorship",

        join:
            "Join Us",

        settings:
            "Settings"

    };


    document.getElementById(
        "pageTitle"
    ).textContent =
        titles[sectionName] ||
        "Dashboard";

}


window.showSection =
    showSection;


/* ==========================================================
   FORMS
========================================================== */

function setupForms() {

    document
        .getElementById(
            "blogForm"
        )
        .addEventListener(
            "submit",
            saveBlog
        );


    document
        .getElementById(
            "eventForm"
        )
        .addEventListener(
            "submit",
            saveEvent
        );


    document
        .getElementById(
            "leaderForm"
        )
        .addEventListener(
            "submit",
            saveLeader
        );


    document
        .getElementById(
            "saveMentorshipBtn"
        )
        .addEventListener(
            "click",
            saveMentorship
        );


    document
        .getElementById(
            "saveJoinBtn"
        )
        .addEventListener(
            "click",
            saveJoinUs
        );

}


/* ==========================================================
   SEARCH
========================================================== */

function setupSearch() {

    document
        .getElementById(
            "blogSearch"
        )
        .addEventListener(
            "input",
            event => {

                renderBlogTable(
                    event.target.value
                );

            }
        );


    document
        .getElementById(
            "eventSearch"
        )
        .addEventListener(
            "input",
            event => {

                renderEventsTable(
                    event.target.value
                );

            }
        );


    document
        .getElementById(
            "leaderSearch"
        )
        .addEventListener(
            "input",
            event => {

                renderLeadersTable(
                    event.target.value
                );

            }
        );


    document
        .getElementById(
            "messageSearch"
        )
        .addEventListener(
            "input",
            event => {

                renderMessagesTable(
                    event.target.value
                );

            }
        );

}


/* ==========================================================
   IMAGE PREVIEWS
========================================================== */

function setupImagePreviews() {

    setupPreview(
        "blogImage",
        "blogImagePreview",
        "blogImagePreviewContainer"
    );


    setupPreview(
        "eventImage",
        "eventImagePreview",
        "eventImagePreviewContainer"
    );


    setupPreview(
        "leaderImage",
        "leaderImagePreview",
        "leaderImagePreviewContainer"
    );


}


function setupPreview(
    inputId,
    previewId,
    containerId
) {

    const input =
        document.getElementById(
            inputId
        );


    input.addEventListener(
        "change",
        () => {

            const file =
                input.files[0];


            if (!file) {
                return;
            }


            const url =
                URL.createObjectURL(
                    file
                );


            document.getElementById(
                previewId
            ).src =
                url;


            document.getElementById(
                containerId
            ).style.display =
                "block";

        }
    );

}


/* ==========================================================
   BUTTONS
========================================================== */

function setupButtons() {

    document
        .getElementById(
            "mobileMenu"
        )
        .addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "sidebar"
                    )
                    .classList.add(
                        "open"
                    );


                document
                    .getElementById(
                        "sidebarOverlay"
                    )
                    .classList.add(
                        "open"
                    );

            }
        );


    document
        .getElementById(
            "sidebarOverlay"
        )
        .addEventListener(
            "click",
            closeMobileSidebar
        );


    document
        .getElementById(
            "refreshBtn"
        )
        .addEventListener(
            "click",
            async () => {

                await loadEverything();

                showToast(
                    "Dashboard refreshed.",
                    "success"
                );

            }
        );


    document
        .getElementById(
            "viewSiteBtn"
        )
        .addEventListener(
            "click",
            () => {

                window.open(
                    "index.html",
                    "_blank"
                );

            }
        );


    document
        .getElementById(
            "logoutBtn"
        )
        .addEventListener(
            "click",
            logout
        );

}


/* ==========================================================
   LOGOUT
========================================================== */

async function logout() {

    try {

        const {
            error
        } =
            await supabaseClient
                .auth
                .signOut();


        if (error) {
            throw error;
        }


        window.location.href =
            "admin-login.html";

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


/* ==========================================================
   MODAL
========================================================== */

function closeModal(
    id
) {

    document
        .getElementById(
            id
        )
        .classList.remove(
            "open"
        );

}


window.closeModal =
    closeModal;


window.openBlogModal =
    openBlogModal;


window.openEventModal =
    openEventModal;


window.openLeaderModal =
    openLeaderModal;


window.editBlog =
    editBlog;


window.deleteBlog =
    deleteBlog;


window.editEvent =
    editEvent;


window.deleteEvent =
    deleteEvent;


window.editLeader =
    editLeader;


window.moveLeader =
    moveLeader;


window.deleteLeader =
    deleteLeader;


window.updateMessageStatus =
    updateMessageStatus;


window.deleteMessage =
    deleteMessage;


/* ==========================================================
   MOBILE
========================================================== */

function closeMobileSidebar() {

    document
        .getElementById(
            "sidebar"
        )
        .classList.remove(
            "open"
        );


    document
        .getElementById(
            "sidebarOverlay"
        )
        .classList.remove(
            "open"
        );

}


/* ==========================================================
   TOAST
========================================================== */

function showToast(
    message,
    type = "success"
) {

    const container =
        document.getElementById(
            "toastContainer"
        );


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `toast ${type}`;


    toast.innerHTML = `

        <i
            data-lucide="${
                type === "success"
                ?
                "check-circle"
                :
                "alert-circle"
            }"
        ></i>

        <span>
            ${escapeHTML(message)}
        </span>

    `;


    container.appendChild(
        toast
    );


    lucide.createIcons();


    setTimeout(
        () => {

            toast.remove();

        },
        3500
    );

}


/* ==========================================================
   DATABASE STATUS
========================================================== */

async function updateDatabaseStatus() {

    try {

        const {
            error
        } =
            await supabaseClient
                .from(
                    "events"
                )
                .select(
                    "id"
                )
                .limit(1);


        if (error) {
            throw error;
        }


        document.getElementById(
            "databaseStatus"
        ).textContent =
            "Connected successfully.";


        document.getElementById(
            "settingsDatabaseStatus"
        ).textContent =
            "Connected";


        document.getElementById(
            "settingsDatabaseStatus"
        ).className =
            "status status-active";

    }

    catch (error) {

        document.getElementById(
            "databaseStatus"
        ).textContent =
            "Connection issue.";


        document.getElementById(
            "settingsDatabaseStatus"
        ).textContent =
            "Connection issue";


        document.getElementById(
            "settingsDatabaseStatus"
        ).className =
            "status";

    }

}


/* ==========================================================
   HELPERS
========================================================== */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
    .replace(
        /[&<>"']/g,
        char =>
            ({
                "&":
                    "&amp;",
                "<":
                    "&lt;",
                ">":
                    "&gt;",
                '"':
                    "&quot;",
                "'":
                    "&#039;"
            }[char])
    );

}


function trimText(
    value,
    length
) {

    const text =
        String(value || "").trim();


    if (text.length <= length) {
        return text;
    }


    return `${text.slice(0, length).trim()}...`;

}


function blogImageUrl(
    post
) {

    return post?.resolved_blog_image_url ||
        post?.featured_image_url ||
        post?.image_url ||
        "";

}


function eventImageUrl(
    event
) {

    return event?.resolved_event_image_url ||
        event?.image_url ||
        "";

}


function leaderImageUrl(
    leader
) {

    return leader?.resolved_leader_image_url ||
        leader?.image_url ||
        "";

}


async function resolveEventImage(
    event
) {

    return {
        ...event,
        resolved_event_image_url:
            await resolveStorageImageUrl(
                event?.image_url
            )
    };

}


async function resolveLeaderImage(
    leader
) {

    return {
        ...leader,
        resolved_leader_image_url:
            await resolveStorageImageUrl(
                leader?.image_url
            )
    };

}


async function resolveBlogPostImage(
    post
) {

    return {
        ...post,
        resolved_blog_image_url:
            await resolveStorageImageUrl(
                post?.featured_image_url ||
                post?.image_url
            )
    };

}


async function resolveStorageImageUrl(
    url
) {

    const storagePath =
        storagePathFromImageUrl(
            url
        );


    if (!storagePath) {
        return url || "";
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(
                storagePath,
                60 * 60
            );


    if (
        error ||
        !data?.signedUrl
    ) {
        return url || "";
    }


    return data.signedUrl;

}


function storagePathFromImageUrl(
    url
) {

    if (!url) {
        return "";
    }


    const value =
        String(url).trim();


    if (
        value.startsWith("blogs/") ||
        value.startsWith("site/") ||
        value.startsWith("events/") ||
        value.startsWith("leaders/")
    ) {
        return value;
    }


    try {

        const parsed =
            new URL(value);

        const markers = [
            `/storage/v1/object/public/${STORAGE_BUCKET}/`,
            `/storage/v1/object/sign/${STORAGE_BUCKET}/`,
            `/storage/v1/object/${STORAGE_BUCKET}/`
        ];


        for (const marker of markers) {

            const index =
                parsed.pathname.indexOf(
                    marker
                );

            if (index !== -1) {
                return decodeURIComponent(
                    parsed.pathname.slice(
                        index + marker.length
                    )
                );
            }

        }

    }

    catch {
        return "";
    }


    return "";

}


function blogAuthorName(
    post
) {

    return post?.profiles?.full_name ||
        post?.profiles?.email ||
        currentProfile?.full_name ||
        currentUser?.email ||
        "";

}


function leaderStatusValue(
    leader
) {

    return leader?.is_active === false
        ? "inactive"
        : "active";

}


function leaderStatusLabel(
    leader
) {

    return leaderStatusValue(leader) === "active"
        ? "active"
        : "inactive";

}


function orderedLeaders(
    list
) {

    return [...list].sort(
        (first, second) => {

            const firstOrder =
                leaderDisplayOrderValue(
                    first
                );

            const secondOrder =
                leaderDisplayOrderValue(
                    second
                );


            if (
                firstOrder !==
                secondOrder
            ) {
                return firstOrder -
                    secondOrder;
            }


            return new Date(
                second.created_at ||
                0
            ).getTime() -
                new Date(
                    first.created_at ||
                    0
                ).getTime();

        }
    );

}


function leaderDisplayOrderValue(
    leader
) {

    const order =
        Number.parseInt(
            leader?.display_order,
            10
        );


    return Number.isFinite(order)
        ? order
        : Number.MAX_SAFE_INTEGER;

}


function nextLeaderDisplayOrder() {

    const orders =
        leaders
            .map(
                leader =>
                    Number.parseInt(
                        leader.display_order,
                        10
                    )
            )
            .filter(
                Number.isFinite
            );


    if (!orders.length) {
        return 10;
    }


    return Math.max(
        ...orders
    ) + 10;

}


function normalizeDisplayOrder(
    value,
    fallback
) {

    const order =
        Number.parseInt(
            value,
            10
        );


    if (
        Number.isFinite(order) &&
        order > 0
    ) {
        return order;
    }


    return fallback;

}


function statusClass(
    value,
    fallback
) {

    const status =
        String(value || fallback || "")
            .toLowerCase()
            .replace(
                /[^a-z0-9_-]/g,
                "-"
            )
            .replace(
                /-+/g,
                "-"
            )
            .replace(
                /^-|-$/g,
                ""
            );


    return `status-${status || "default"}`;

}


function inlineHandlerArg(
    value
) {

    return escapeHTML(
        String(value ?? "")
            .replace(
                /\\/g,
                "\\\\"
            )
            .replace(
                /'/g,
                "\\'"
            )
            .replace(
                /\r?\n/g,
                " "
            )
    );

}


function slugify(
    value
) {

    const slug =
        String(value || "")
            .trim()
            .toLowerCase()
            .replace(
                /[^a-z0-9]+/g,
                "-"
            )
            .replace(
                /^-|-$/g,
                ""
            );


    return slug ||
        `post-${Date.now()}`;

}


function normalizeRecordId(
    id
) {

    if (id === null || id === undefined || id === "") {
        return null;
    }


    return requireRecordId(id);

}


function requireRecordId(
    id
) {

    const value =
        String(id || "").trim();


    const isSafe =
        /^[a-zA-Z0-9_-]{1,80}$/.test(value);


    if (!isSafe) {

        throw new Error(
            "Invalid record identifier."
        );

    }


    return value;

}


function formatDate(
    value
) {

    if (!value) {
        return "â€”";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "â€”";

    }


    return date.toLocaleDateString(
        "en-GH",
        {
            year:
                "numeric",

            month:
                "short",

            day:
                "numeric"
        }
    );

}


function toDateTimeLocal(
    value
) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    const offset =
        date.getTimezoneOffset();


    const local =
        new Date(
            date.getTime() -
            offset * 60000
        );


    return local
        .toISOString()
        .slice(
            0,
            16
        );

}


/* ==========================================================
   MODAL OUTSIDE CLICK
========================================================== */

document
    .querySelectorAll(
        ".modal"
    )
    .forEach(
        modal => {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        modal
                    ) {

                        modal.classList.remove(
                            "open"
                        );

                    }

                }
            );

        }
    );


/* ==========================================================
   AUTH STATE
========================================================== */

supabaseClient
    .auth
    .onAuthStateChange(
        (
            event,
            session
        ) => {

            if (
                event ===
                "SIGNED_OUT"
            ) {

                window.location.href =
                    "admin-login.html";

            }


            if (
                session &&
                session.user
            ) {

                currentUser =
                    session.user;

                updateUserInterface();

            }

        }
    );


