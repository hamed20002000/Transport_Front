import mock from 'src/core/api/mock';
import 'src/features/blog/testing/blogData';
import 'src/features/contacts/testing/ContactsData';
import 'src/features/chat/testing/Chatdata';
import 'src/features/notes/testing/NotesData';
import 'src/features/tickets/testing/TicketData';
import 'src/features/ecommerce/testing/ProductsData';
import 'src/features/email/testing/EmailData';
import 'src/features/profile/testing/PostData';
import 'src/features/profile/testing/UsersData';

mock.onAny().passThrough();
