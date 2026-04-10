const API_URL = '/api/items';

let allItems = [];

const MOCK_ITEMS = [
    {
        id: 1,
        name: "Scientific Calculator (Casio fx-991EX)",
        description: "Perfect working condition. Required for Engineering Math exams.",
        price: 50,
        timeUnit: "day",
        category: "Electronics",
        status: "Available",
        owner: "Rahul Sharma",
        image: "../assets/images/casio.jpg"
    },
    {
        id: 2,
        name: "Engineering Drafter",
        description: "Mini drafter with clear scales. Barely used.",
        price: 150,
        timeUnit: "week",
        category: "Lab Equipment",
        status: "Available",
        owner: "Sneha Patel",
        image: "../assets/images/drawingboard.jpg"
    },
    {
        id: 3,
        name: "Introduction to Algorithms (Cormen)",
        description: "Standard textbook for Data Structures. Contains some highlights.",
        price: 300,
        timeUnit: "month",
        category: "Books",
        status: "In Use",
        owner: "Aditya Verma",
        image: "../assets/images/book.jpg"
    }
];

// When the page loads, fetch the items!
document.addEventListener('DOMContentLoaded', () => {
    fetchItems();

    // Add event listener for category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            const selectedCategory = e.target.value;
            if (selectedCategory === 'All Categories') {
                renderItems(allItems);
            } else {
                const filteredItems = allItems.filter(item => item.category === selectedCategory);
                renderItems(filteredItems);
            }
        });
    }
});

// 1. GET Request: Fetch items from our Express backend
async function fetchItems() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Backend response not ok");
        const data = await response.json();

        allItems = data;
        // Pass the fetched items array to our render function
        renderItems(data);
    } catch (error) {
        console.warn("Backend not reachable. Falling back to mock data.", error);
        allItems = [...MOCK_ITEMS];
        renderItems(allItems);
    }
}

// 2. Render HTML Cards Dynamically
function renderItems(items) {
    const grid = document.getElementById('itemsGrid');
    grid.innerHTML = ''; // Start clean

    items.forEach((item) => {
        // Simple logic to style the Available vs In Use status
        const isAvailable = item.status === "Available";
        const badgeClass = isAvailable ? "bg-success" : "bg-warning bg-orange-400";

        const userJson = localStorage.getItem('user');
        const userObj = userJson ? JSON.parse(userJson) : null;
        const isOwner = userObj ? (item.owner === userObj.name) : false;

        let requestButton = '';
        if (isOwner) {
            requestButton = `
                <button disabled class="text-xs font-semibold bg-gray-100 text-gray-400 px-3 py-2 rounded-lg border border-gray-200 cursor-not-allowed hidden sm:inline-block">Your Item</button>
                <button onclick="removeItem(${item.id})" class="text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-2 rounded-lg transition-all border border-red-200 hover:border-red-600">Remove</button>
            `;
        } else if (isAvailable) {
            requestButton = `<button onclick="requestBorrow(${item.id}, '${item.name.replace(/'/g, "\\'")}', '${item.owner.replace(/'/g, "\\'")}')" class="text-sm font-semibold bg-gray-50 text-gray-700 hover:bg-primary hover:text-white px-4 py-2 rounded-lg transition-all border border-gray-200 hover:border-primary">Request</button>`;
        } else {
            requestButton = `<button onclick="alert('Item currently in use. You can join the waitlist!')" class="text-sm font-semibold bg-white text-gray-400 px-4 py-2 rounded-lg border border-gray-200 cursor-not-allowed">Waitlist</button>`;
        }

        // Card HTML string (simulating our hardcoded UI)
        const cardHTML = `
            <div class="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden hover:shadow-[0_8px_20px_-6px_rgba(37,99,235,0.15)] hover:-translate-y-1 transition-all duration-300 group flex flex-col">
                <div class="h-44 bg-gray-100 relative overflow-hidden">
                    <img src="${item.image}" alt="${item.name}"
                        class="w-full h-full object-contain bg-white p-3 group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm border border-gray-100">
                        ${item.category}
                    </div>
                    <div class="absolute bottom-3 left-3 bg-white/95 backdrop-blur px-2 py-1 rounded-md text-xs font-semibold text-gray-600 flex items-center gap-1 shadow-sm">
                        <span class="w-2 h-2 rounded-full ${badgeClass}"></span> ${item.status}
                    </div>
                </div>
                <div class="p-4 flex flex-col flex-1">
                    <h3 class="text-lg font-bold text-gray-900 leading-tight mb-1 truncate">${item.name}</h3>
                    <p class="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">${item.description}</p>
                    
                    <div class="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                        <div>
                            <span class="text-lg font-extrabold text-primary">₹${item.price}</span>
                            <span class="text-xs text-gray-500 font-medium">/${item.timeUnit}</span>
                        </div>
                        ${requestButton}
                    </div>
                </div>
            </div>
        `;

        // Inject HTML into the grid
        grid.innerHTML += cardHTML;
    });
}

// 3. POST Request: Submit new item to backend
window.handleListSubmit = async function (event) {
    event.preventDefault(); // Stop normal form reload

    // Grab input values via their IDs
    const name = document.getElementById('itemName').value;
    const description = document.getElementById('itemDesc').value;
    const price = document.getElementById('itemPrice').value;
    const timeUnit = document.getElementById('itemTimeUnit').value;
    const category = document.getElementById('itemCategory') ? document.getElementById('itemCategory').value : 'General';
    const imageInput = document.getElementById('itemImage');

    const userJson = localStorage.getItem('user');
    const userObj = userJson ? JSON.parse(userJson) : null;
    const currentOwner = userObj ? userObj.name : "Anonymous";

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Uploading to Cloudinary...";
    submitBtn.disabled = true;

    // Use FormData for secure binary image streaming
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('timeUnit', timeUnit);
    formData.append('category', category);
    formData.append('owner', currentOwner);
    
    if (imageInput && imageInput.files && imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    try {
        // Send POST request
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            // Success! Refetch items from backend to auto-update UI
            fetchItems();

            // Show toast & Reset form
            const toast = document.getElementById('toastNotification');
            document.getElementById('listItemForm').reset();

            toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
            toast.classList.add('translate-y-0', 'opacity-100');
            setTimeout(() => {
                toast.classList.remove('translate-y-0', 'opacity-100');
                toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
            }, 3000);
        } else {
            alert('Failed to list item. Backend returned an error.');
        }
    } catch (error) {
        console.warn("Error creating item on backend.", error);
        alert('Server unreachable. Could not upload your item.');
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
}

// 4. DELETE Request: Remove item from backend
window.removeItem = async function(id) {
    if (!confirm("Are you sure you want to remove this item?")) return;
    
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Refetch to update grid
            fetchItems();
        } else {
            console.warn("Failed to delete the item from backend, simulating delete locally.");
            allItems = allItems.filter(i => i.id !== id);
            const filterVal = document.getElementById('categoryFilter') ? document.getElementById('categoryFilter').value : 'All Categories';
            if (filterVal !== 'All Categories') {
                renderItems(allItems.filter(item => item.category === filterVal));
            } else {
                renderItems(allItems);
            }
        }
    } catch (error) {
        console.error("Error deleting item:", error);
        alert('An error occurred while deleting.');
    }
}

// 5. POST Request: Submit borrow request to backend
window.requestBorrow = async function(itemId, itemName, ownerName) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert("Please login to request items.");
        window.location.href = 'auth.html';
        return;
    }

    try {
        const response = await fetch(`/api/items/${itemId}/request`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (response.ok) {
            showRequestModal(itemName, ownerName);
        } else {
            alert(data.message || "Failed to send request.");
        }
    } catch (error) {
        console.error("Error requesting item:", error);
        alert("Failed to send request, please try again.");
    }
};
